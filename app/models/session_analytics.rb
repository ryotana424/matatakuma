# ロード済みセッション配列に対する集計。ビュー描画用に全件ロード済みの配列を
# 受け取り、追加クエリを発生させずに計算する
class SessionAnalytics
  # 5指標の表示ラベルと対応カラム
  METRIC_ATTRIBUTES = {
    "視線" => :gaze_on_screen_ratio,
    "姿勢" => :head_stable_ratio,
    "まばたき" => :blink_normal_ratio,
    "継続性" => :session_continuity_ratio,
    "顔検出" => :face_present_ratio
  }.freeze

  class << self
    # 指定カラムの平均。空配列なら nil
    def average(sessions, attribute)
      return nil if sessions.empty?

      sessions.sum { |session| session.public_send(attribute) }.to_f / sessions.size
    end

    # 日次サマリー・施策比較で共通に使う基本集計
    def summary(sessions)
      {
        count: sessions.size,
        avg_score: average(sessions, :avg_score)&.round,
        total_duration_sec: sessions.sum(&:duration_sec),
        low_away_ratio: low_away_ratio(sessions),
        avg_interrupt_count: average(sessions, :interrupt_count)&.round(1)
      }
    end

    # 低集中＋離席の平均比率（%）。空配列なら nil
    def low_away_ratio(sessions)
      return nil if sessions.empty?

      ((average(sessions, :low_ratio) + average(sessions, :away_ratio)) * 100).round
    end

    # 5指標それぞれの平均（%）。空配列なら nil
    def metric_averages(sessions)
      return nil if sessions.empty?

      METRIC_ATTRIBUTES.transform_values { |attribute| (average(sessions, attribute) * 100).round }
    end

    # 5指標のうち最も低いものを改善候補として返す
    def weakest_metric(sessions)
      averages = metric_averages(sessions)
      return nil unless averages

      label, value = averages.min_by { |_label, metric_value| metric_value }
      { label: label, value: value }
    end

    # 時間帯（0〜23時）ごとの平均スコア。セッション内の時間帯別スコアは保存して
    # いないため、セッション平均スコアが計測時間全体で一定だったとみなし、
    # 各時間帯に在席した秒数で重み付けした近似値を返す
    def hourly_focus(sessions)
      buckets = Array.new(24) { { weighted: 0.0, seconds: 0.0 } }

      sessions.each do |session|
        started = session.started_at
        ended = session_end_time(session)
        next if ended.nil? || ended <= started

        cursor = started
        while cursor < ended
          segment_end = [cursor.beginning_of_hour + 1.hour, ended].min
          seconds = segment_end - cursor
          buckets[cursor.hour][:weighted] += session.avg_score * seconds
          buckets[cursor.hour][:seconds] += seconds
          cursor = segment_end
        end
      end

      buckets.each_with_index.map do |bucket, hour|
        avg = bucket[:seconds].positive? ? (bucket[:weighted] / bucket[:seconds]).round : nil
        { hour: hour, avg_score: avg }
      end
    end

    private

    # セッションの実質終了時刻。中断などで ended_at が無い場合は last_seen_at、
    # それも無ければ開始時刻＋計測秒数で補完する
    def session_end_time(session)
      return session.ended_at if session.ended_at
      return session.last_seen_at if session.last_seen_at

      session.duration_sec.positive? ? session.started_at + session.duration_sec : nil
    end
  end
end

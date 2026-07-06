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
  end
end

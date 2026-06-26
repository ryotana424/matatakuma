module ApplicationHelper
  # 秒数を H:MM:SS 形式に整形する
  def format_duration(total_sec)
    total_sec = total_sec.to_i
    h = total_sec / 3600
    m = (total_sec % 3600) / 60
    s = total_sec % 60
    format("%d:%02d:%02d", h, m, s)
  end
end

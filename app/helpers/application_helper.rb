module ApplicationHelper
  # 秒数を H:MM:SS 形式に整形する
  def format_duration(total_sec)
    total_sec = total_sec.to_i
    h = total_sec / 3600
    m = (total_sec % 3600) / 60
    s = total_sec % 60
    format("%d:%02d:%02d", h, m, s)
  end

  def format_focus_volume(value)
    value = value.to_f
    return format_compact_number(value / 1_000_000, "m") if value.abs >= 1_000_000
    return format_compact_number(value / 1_000, "k") if value.abs >= 1_000

    value.round.to_s
  end

  private

  def format_compact_number(value, suffix)
    rounded = value.round(1)
    number = rounded == rounded.to_i ? rounded.to_i.to_s : rounded.to_s
    "#{number}#{suffix}"
  end
end

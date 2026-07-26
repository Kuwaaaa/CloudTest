@echo off
:: ddagrab 抓取的是整个显示器，不支持 title="窗口名"
:: 所以我们直接抓取主显示器 (索引 0)

:CheckWindow
:: 注意：使用 ddagrab 时，最好确保显卡驱动已安装，且连接了显示器（或插了显卡欺骗器）
:: 优化参数：-f lavfi -i ddagrab=0
:: -c:v h264_nvenc: N卡硬编 (AMD显卡用 h264_amf, 核显用 h264_qsv)
ffmpeg -f lavfi -i ddagrab=0 -c:v h264_nvenc -preset p1 -zerolatency 1 -rc cbr_ld_hq -g 60 -b:v 4M -maxrate 4M -bufsize 8M -f mpegts - -loglevel error

if %ERRORLEVEL% NEQ 0 (
    echo [WARN] FFmpeg exited (maybe ddagrab failed). Retrying... >&2
    timeout /t 2 >nul
    goto CheckWindow
)
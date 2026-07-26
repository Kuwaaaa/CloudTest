@echo off
echo [1/4] Installing global dependencies...
npm install -g pm2

echo [2/4] Installing App dependencies...
cd apps\web && npm install && npm run build
cd ..\sidecar && npm install
cd ..\..

echo [3/4] Configuring Firewall...
:: 放行 3000(Web), 8888(Sidecar), 8555(WebRTC), 1984(API)
netsh advfirewall firewall add rule name="CloudRender Ports" dir=in action=allow protocol=TCP localport=3000,8888,8555,1984
netsh advfirewall firewall add rule name="CloudRender UDP" dir=in action=allow protocol=UDP localport=8555

echo [4/4] Done! Run 'pm2 start ecosystem.config.js' to start.
pause
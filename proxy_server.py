"""
简单的API代理服务器 - 解决CORS跨域问题
使用Python内置库，无需额外安装依赖

使用方法:
python proxy_server.py
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
import ssl

class ProxyHandler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        """设置CORS头"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    def do_OPTIONS(self):
        """处理OPTIONS预检请求"""
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()
    
    def do_POST(self):
        """处理POST请求"""
        if self.path == '/api/proxy':
            try:
                # 读取请求体
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request_data = json.loads(post_data.decode('utf-8'))
                
                # 提取参数
                url = request_data.get('url')
                api_key = request_data.get('apiKey')
                model = request_data.get('model', 'gpt-3.5-turbo')
                messages = request_data.get('messages', [])
                temperature = request_data.get('temperature', 0.8)
                max_tokens = request_data.get('max_tokens', 1000)
                
                if not url or not api_key:
                    self.send_response(400)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'error': '缺少必要参数',
                        'code': 'MISSING_PARAMS'
                    }).encode())
                    return
                
                # 构建请求体
                request_body = {
                    'model': model,
                    'messages': messages,
                    'temperature': temperature,
                    'max_tokens': max_tokens
                }
                
                # 创建请求
                req = urllib.request.Request(
                    url,
                    data=json.dumps(request_body).encode('utf-8'),
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {api_key}'
                    }
                )
                
                # 发送请求（忽略SSL证书验证，仅用于开发）
                try:
                    # 创建不验证SSL的上下文
                    context = ssl._create_unverified_context()
                    response = urllib.request.urlopen(req, context=context, timeout=30)
                    response_data = response.read().decode('utf-8')
                    
                    # 返回成功响应
                    self.send_response(200)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(response_data.encode())
                    
                except urllib.error.HTTPError as e:
                    error_response = e.read().decode('utf-8')
                    self.send_response(e.code)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'error': 'API请求失败',
                        'details': json.loads(error_response) if error_response else str(e),
                        'code': 'API_ERROR'
                    }).encode())
                    
                except urllib.error.URLError as e:
                    self.send_response(503)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'error': 'API服务器无响应',
                        'reason': str(e),
                        'code': 'API_UNAVAILABLE'
                    }).encode())
                    
                except Exception as e:
                    self.send_response(500)
                    self._set_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'error': '请求失败',
                        'message': str(e),
                        'code': 'REQUEST_ERROR'
                    }).encode())
                
            except json.JSONDecodeError:
                self.send_response(400)
                self._set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': '无效的JSON格式',
                    'code': 'INVALID_JSON'
                }).encode())
                
            except Exception as e:
                self.send_response(500)
                self._set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': '服务器错误',
                    'message': str(e),
                    'code': 'INTERNAL_ERROR'
                }).encode())
        else:
            self.send_response(404)
            self._set_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': '未找到',
                'message': '请求的端点不存在'
            }).encode())
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[{self.log_date_time_string()}] {format % args}")
        
        if 'api/proxy' in args[0]:
            print("🔄 代理API请求")
        elif '200' in args[1]:
            print("✅ 请求成功")
        elif '4' in args[1] or '5' in args[1]:
            print("❌ 请求失败")

def run_server(port=3000):
    """启动服务器"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, ProxyHandler)
    
    print('')
    print('🚀 API代理服务器')
    print('=' * 50)
    print(f'📍 服务器运行在: http://localhost:{port}')
    print('')
    print('📋 可用端点:')
    print('  POST /api/proxy (API代理)')
    print('')
    print('✅ 服务器已启动，按 Ctrl+C 停止')
    print('=' * 50)
    print('')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('')
        print('🛑 服务器已停止')
        httpd.server_close()

if __name__ == '__main__':
    run_server()
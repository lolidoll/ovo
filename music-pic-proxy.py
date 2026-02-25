#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GD音乐API 图片代理服务
解决前端CORS问题，代理GD API的图片请求，带缓存和CDN加速
"""

from flask import Flask, request, send_file
import requests
from io import BytesIO
import logging
from datetime import datetime, timedelta

app = Flask(__name__)

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# GD API基础URL
GD_API_BASE = 'https://music-api.gdstudio.xyz/api.php'

# 【新增】内存缓存 - 缓存图片URL和内容
pic_cache = {}  # {pic_id_size: {'url': '...', 'data': b'...', 'time': datetime, 'headers': {}}}
CACHE_TTL = 3600  # 缓存1小时

def get_cache_key(pic_id, size):
    """生成缓存键"""
    return f"{pic_id}_{size}"

def is_cache_valid(cache_entry):
    """检查缓存是否有效"""
    if not cache_entry:
        return False
    return datetime.now() - cache_entry['time'] < timedelta(seconds=CACHE_TTL)

def clear_expired_cache():
    """清理过期缓存"""
    global pic_cache
    expired = [k for k, v in pic_cache.items() if not is_cache_valid(v)]
    for k in expired:
        del pic_cache[k]
        logger.info(f'Cache expired: {k}')

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return {'status': 'OK', 'cache_size': len(pic_cache)}, 200

@app.route('/api/music/pic', methods=['GET'])
def get_music_pic():
    """
    音乐图片代理端点（带缓存）
    参数: pic_id, size (可选，默认300)
    """
    try:
        pic_id = request.args.get('pic_id')
        size = request.args.get('size', '300')
        
        if not pic_id:
            return {'error': 'Missing pic_id'}, 400
        
        cache_key = get_cache_key(pic_id, size)
        
        # 【新增】检查缓存
        clear_expired_cache()  # 先清理过期缓存
        if cache_key in pic_cache and is_cache_valid(pic_cache[cache_key]):
            logger.info(f'[CACHE HIT] {pic_id} (Total cached: {len(pic_cache)})')
            cache_entry = pic_cache[cache_key]
            return send_file(
                BytesIO(cache_entry['data']),
                mimetype=cache_entry['headers'].get('content-type', 'image/jpeg'),
                as_attachment=False,
                download_name=f'pic_{pic_id}.jpg'
            )
        
        logger.info(f'[FETCH] Getting pic: {pic_id} ({size}x{size})')
        
        # 调用GD API获取图片URL
        gd_url = f'{GD_API_BASE}?types=pic&source=netease&id={pic_id}&size={size}'
        
        response = requests.get(
            gd_url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'},
            timeout=5
        )
        
        if response.status_code != 200:
            logger.error(f'GD API error: {response.status_code}')
            return {'error': f'GD API error: {response.status_code}'}, 500
        
        # GD API返回JSON格式: {"url": "https://...", ...}
        try:
            data = response.json()
            pic_url = data.get('url')
            
            if not pic_url:
                logger.error(f'Invalid GD response: {data}')
                return {'error': 'Cannot get pic URL'}, 500
            
            logger.info(f'[GD API] Got URL: {pic_url[:60]}...')
            
            # 获取真实图片
            pic_response = requests.get(
                pic_url,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'},
                timeout=5
            )
            
            if pic_response.status_code != 200:
                logger.error(f'Pic URL error: {pic_response.status_code}')
                return {'error': 'Cannot get pic'}, 500
            
            content_type = pic_response.headers.get('content-type', 'image/jpeg')
            pic_data = pic_response.content
            
            # 【新增】缓存图片数据
            pic_cache[cache_key] = {
                'url': pic_url,
                'data': pic_data,
                'time': datetime.now(),
                'headers': {'content-type': content_type}
            }
            logger.info(f'[CACHE] Saved: {cache_key} (Total: {len(pic_cache)})')
            
            # 返回图片数据
            return send_file(
                BytesIO(pic_data),
                mimetype=content_type,
                as_attachment=False,
                download_name=f'pic_{pic_id}.jpg'
            )
            
        except ValueError as e:
            logger.error(f'Invalid JSON: {str(e)[:50]}')
            return {'error': 'Get pic failed'}, 500
        
    except requests.Timeout:
        logger.error('Request timeout')
        return {'error': 'Timeout'}, 504
    except Exception as e:
        logger.error(f'Proxy error: {str(e)}')
        return {'error': str(e)}, 500

if __name__ == '__main__':
    logger.info('Starting music pic proxy service')
    logger.info('Server running at: http://localhost:3000')
    logger.info('Endpoints:')
    logger.info('  GET /health')
    logger.info('  GET /api/music/pic?pic_id=xxx&size=300')
    logger.info('')
    app.run(host='localhost', port=3000, debug=False)

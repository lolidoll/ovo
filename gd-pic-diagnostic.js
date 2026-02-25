/**
 * GD音乐台API 封面获取诊断脚本
 * 在浏览器控制台运行此脚本来诊断pic_id问题
 */

window.GDPicDiagnostic = {
    // 测试搜索并检查返回的数据结构
    testSearch: async function(keyword = '稻香') {
        console.log('=== GD音乐台API 搜索诊断 ===');
        console.log('搜索关键词:', keyword);
        
        try {
            const url = `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(keyword)}&count=5`;
            console.log('📡 请求URL:', url);
            
            const res = await fetch(url);
            const data = await res.json();
            
            console.log('📊 返回数据类型:', Array.isArray(data) ? '数组' : typeof data);
            console.log('📊 返回数据长度:', data ? data.length : 0);
            
            if (data && data.length > 0) {
                console.log('\n【第一条数据完整结构】');
                console.log(JSON.stringify(data[0], null, 2));
                
                console.log('\n【所有可用字段检查】');
                const item = data[0];
                const fields = [
                    'id', 'name', 'title', 'artist', 'author',
                    'pic', 'pic_id', 'pic_url', 'album_pic', 'album_id',
                    'album_pic_id', 'album', 'cover', 'url', 'lyric_id'
                ];
                
                fields.forEach(field => {
                    if (field in item) {
                        console.log(`✅ ${field}:`, item[field], `(${typeof item[field]})`);
                    } else {
                        console.log(`❌ ${field}: 不存在`);
                    }
                });
                
                console.log('\n【图片相关字段】');
                console.log('pic:', item.pic);
                console.log('pic_id:', item.pic_id);
                console.log('pic_url:', item.pic_url);
                console.log('album_pic:', item.album_pic);
                console.log('album_pic_id:', item.album_pic_id);
                
                // 尝试生成图片URL
                if (item.pic_id) {
                    const picUrl = `https://music-api.gdstudio.xyz/api.php?types=pic&source=netease&id=${item.pic_id}&size=300`;
                    console.log('\n✅ 生成的pic URL:', picUrl);
                    
                    // 测试获取图片
                    console.log('测试获取图片...');
                    const picRes = await fetch(picUrl);
                    const picData = await picRes.json();
                    console.log('📷 图片API返回:', picData);
                } else {
                    console.warn('⚠️ pic_id为空，无法生成图片URL');
                }
            } else {
                console.error('❌ 无搜索结果');
            }
            
            return data;
        } catch (e) {
            console.error('❌ 错误:', e);
        }
    },
    
    // 直接测试图片获取API
    testPicApi: async function(picId = 109951163627749651) {
        console.log('=== GD音乐台API 图片获取诊断 ===');
        console.log('图片ID:', picId);
        
        try {
            const url = `https://music-api.gdstudio.xyz/api.php?types=pic&source=netease&id=${picId}&size=300`;
            console.log('📡 请求URL:', url);
            
            const res = await fetch(url);
            const data = await res.json();
            
            console.log('📷 返回数据:', data);
            console.log('📷 返回的url:', data.url);
            
            if (data.url) {
                console.log('✅ 图片URL获取成功');
                return data.url;
            } else {
                console.error('❌ 无图片URL');
            }
        } catch (e) {
            console.error('❌ 错误:', e);
        }
    },
    
    // 综合诊断
    runFullDiagnostic: async function() {
        console.clear();
        console.log('🔍 开始GD音乐台API封面诊断...\n');
        
        // 第一步：测试搜索
        const searchData = await this.testSearch('稻香');
        
        if (searchData && searchData.length > 0) {
            const picId = searchData[0].pic_id;
            if (picId) {
                console.log('\n' + '='.repeat(50));
                console.log('第二步：测试图片API');
                console.log('='.repeat(50) + '\n');
                
                // 第二步：测试图片API
                const picUrl = await this.testPicApi(picId);
                
                if (picUrl) {
                    console.log('\n✅ 诊断完成：封面获取流程正常');
                } else {
                    console.error('\n❌ 诊断完成：图片API返回无URL');
                }
            } else {
                console.error('\n❌ 诊断完成：搜索结果无pic_id');
            }
        } else {
            console.error('\n❌ 诊断完成：搜索失败');
        }
    }
};

console.log('✅ 诊断脚本已加载');
console.log('运行诊断: window.GDPicDiagnostic.runFullDiagnostic()');
console.log('搜索测试: window.GDPicDiagnostic.testSearch("周杰伦")');
console.log('图片测试: window.GDPicDiagnostic.testPicApi(123456)');

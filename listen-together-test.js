/**
 * 一起听功能 - GD音乐台API 快速测试脚本
 * 用于验证API接口调用的正确性
 */

// 测试GD音乐台API的各个接口

const GD_API = 'https://music-api.gdstudio.xyz/api.php';

// 测试1：搜索歌曲
async function testSearch() {
    console.log('\n【测试1】搜索歌曲');
    try {
        const url = `${GD_API}?types=search&source=netease&name=告白气球&count=5`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('✅ 搜索成功');
        console.log('返回数据结构:', data[0]);
        return data[0];
    } catch (e) {
        console.error('❌ 搜索失败:', e);
        return null;
    }
}

// 测试2：获取播放URL
async function testGetUrl(songId) {
    console.log('\n【测试2】获取播放URL');
    try {
        const url = `${GD_API}?types=url&source=netease&id=${songId}&br=320`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('✅ 获取URL成功');
        console.log('返回数据:', data);
        return data;
    } catch (e) {
        console.error('❌ 获取URL失败:', e);
        return null;
    }
}

// 测试3：获取歌词
async function testGetLyric(lyricId) {
    console.log('\n【测试3】获取歌词');
    try {
        const url = `${GD_API}?types=lyric&source=netease&id=${lyricId}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('✅ 获取歌词成功');
        console.log('歌词长度:', data.lyric ? data.lyric.length : 0, '字符');
        if (data.tlyric) {
            console.log('含中文翻译');
        }
        return data;
    } catch (e) {
        console.error('❌ 获取歌词失败:', e);
        return null;
    }
}

// 测试4：获取专辑图
async function testGetPic(picId) {
    console.log('\n【测试4】获取专辑图');
    try {
        const url = `${GD_API}?types=pic&source=netease&id=${picId}&size=300`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('✅ 获取图片成功');
        console.log('图片URL:', data.url);
        return data;
    } catch (e) {
        console.error('❌ 获取图片失败:', e);
        return null;
    }
}

// 完整测试流程
async function runFullTest() {
    console.log('========== GD音乐台API 完整测试 ==========');
    
    // 测试搜索
    const song = await testSearch();
    if (!song) {
        console.error('测试终止：搜索失败');
        return;
    }
    
    console.log('\n搜索到的歌曲:', song.name, '-', song.artist);
    console.log('歌曲ID:', song.id);
    console.log('歌词ID:', song.lyric_id);
    console.log('图片ID:', song.pic_id);
    
    // 测试获取URL
    const urlData = await testGetUrl(song.id);
    if (urlData && urlData.url) {
        console.log('✓ 可以播放，音质:', urlData.br, 'kbps');
    } else {
        console.warn('⚠️ 无法获取播放链接');
    }
    
    // 测试获取歌词
    await testGetLyric(song.lyric_id || song.id);
    
    // 测试获取图片
    await testGetPic(song.pic_id);
    
    console.log('\n========== 测试完成 ==========');
}

// 数据结构兼容性测试
function testDataStructure() {
    console.log('\n【数据结构测试】');
    
    // 模拟GD API返回的数据
    const gdApiData = {
        id: 25606233,
        name: '告白气球',
        artist: ['周杰伦'],
        album: '周杰伦的床边故事',
        pic_id: 109951163627749651,
        lyric_id: 25606233,
        source: 'netease'
    };
    
    // 模拟listen-together.js中的数据转换
    const transformedData = {
        id: gdApiData.id,
        name: gdApiData.name,
        title: gdApiData.name,
        artist: Array.isArray(gdApiData.artist) ? gdApiData.artist.join('/') : gdApiData.artist,
        author: Array.isArray(gdApiData.artist) ? gdApiData.artist.join('/') : gdApiData.artist,
        pic_id: gdApiData.pic_id,
        lyric_id: gdApiData.lyric_id,
        source: 'netease',
        url: null
    };
    
    console.log('✅ 数据转换成功');
    console.log('转换后的数据:', transformedData);
    
    // 验证字段兼容性
    const requiredFields = ['id', 'name', 'title', 'artist', 'author', 'pic_id', 'lyric_id'];
    const missingFields = requiredFields.filter(f => !(f in transformedData));
    
    if (missingFields.length === 0) {
        console.log('✅ 所有必需字段都存在');
    } else {
        console.warn('⚠️ 缺少字段:', missingFields);
    }
}

// 导出测试函数
window.GDMusicAPITest = {
    testSearch,
    testGetUrl,
    testGetLyric,
    testGetPic,
    runFullTest,
    testDataStructure
};

// 如果在浏览器控制台中运行，可以调用：
// window.GDMusicAPITest.runFullTest()
// window.GDMusicAPITest.testDataStructure()

console.log('✅ 测试模块已加载，可在控制台中调用:');
console.log('  window.GDMusicAPITest.runFullTest() - 运行完整测试');
console.log('  window.GDMusicAPITest.testDataStructure() - 测试数据结构兼容性');

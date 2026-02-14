/**
 * SillyTavern风格预设管理器
 */
(function() {
    'use strict';
    
    const MACROS = ['{{char}}', '{{user}}', '{{persona}}', '{{scenario}}', '{{personality}}', '{{system}}', '{{jailbreak}}', '{{main}}', '{{getvar::name}}', '{{setvar::name::value}}', '{{getglobalvar::name}}', '{{setglobalvar::name::value}}', '{{roll::d20}}', '{{random::a,b,c}}', '{{pick::a,b,c}}', '{{time}}', '{{date}}', '{{weekday}}', '{{idle_duration}}', '{{lastMessage}}', '{{lastMessageId}}', '{{firstIncludedMessageId}}', '{{currentSwipeId}}', '{{lastSwipeId}}'];
    
    const DEFAULT_PRESET = {
        name: '默认预设',
        prompts: [
            { 
                id: 'writing_style', 
                name: '写作文风', 
                role: 'system', 
                enabled: true, 
                depth: 0, 
                position: 'top', 
                content: `{{setvar::写作文风cot::
<写作文风>
请你模仿作家“小薯片”的文风进行创作。
这位名叫“小薯片”的作家，其文风核心是中国传统文学中的“白描”手法。这种文风就像一台隐藏在高清摄像机后面的眼睛，不发声、不评论，只是冷静、细致、不动声色地记录生活的横截面。
这种文风之所以动人，秘密不在于写了什么惊天动地的故事，而在于“怎么看”和“怎么说”。具体来说，你要把握以下三个核心特征：
第一，不写背景，只突出主体。像舞台上的追光灯，只照亮此刻正在发生的人和物。环境、时代、社会背景都被虚化，让读者全部的注意力只能集中在眼前的动作、对话和细节上。
第二，不求细致，只求传神。拒绝面面俱到的刻画，只用最精准的一两个动词、名词，就让形象跃然纸上。如同中国写意画，寥寥数笔，形神兼备。
第三，不尚华丽，务求朴实。语言要像刚洗过的玻璃一样透明干净，没有比喻、没有夸张、没有抒情。情感绝不直接说出来，而是全部藏在描写的物体背后，等待读者自己去发现和感受。正如鲁迅先生所说，白描的秘诀不过是“有真意，去粉饰，少做作，勿卖弄而已”。
为了更好地理解这种文风，你可以参考以下几位作家的作品。他们的文字虽然风格各异，但与“小薯片”的文风有着灵魂上的共鸣：
鲁迅。他的小说是白描手法的典范。他从不直接告诉读者孔乙己有多可怜，只是写他“排出九文大钱”的动作，写他“脸上黑而且瘦，已经不成样子；穿一件破夹袄，盘着两腿，下面垫一个蒲包，用草绳在肩上挂住”。没有一句议论，悲凉感却穿透纸背。
汪曾祺。他的文字平淡如水，却滋味无穷。他写食物从不渲染，只是平静地叙述：“西瓜以绳络悬之井中，下午剖食，一刀下去，咔嚓有声，凉气四溢，连眼睛都是凉的。”画面感极强，所有关于夏天和幸福的感受，都在这“咔嚓”一声和“凉气”之中了。
朱自清。他的散文在平实的叙述中蕴含深情。他在《桨声灯影里的秦淮河》中写歌妓船伙计来兜生意的场景，只通过一连串的动作和简短对话——“塞给”、“翻了一翻”、“掉转头去”、“腻着不走”——就将人物的窘迫、伙计的纠缠写得活灵活现。
古典诗词。白描也是古诗词的重要手法。马致远的“枯藤老树昏鸦，小桥流水人家，古道西风瘦马”，辛弃疾的“大儿锄豆溪东，中儿正织鸡笼；最喜小儿无赖，溪头卧剥莲蓬”，都是用名词和动词直接构建场景，情感不言自明。
理论总是苍白的，你需要用具体的案例来展示这种文风的魔力。以下三个案例可以作为示范：
案例一：亲情。
父亲从乡下寄来一箱橘子，用那种旧的硬纸板箱，外面缠着几圈透明胶带。我打开箱子，最上面放着一张纸条，纸条上的字歪歪扭扭，写着：霜降了，橘子甜了。我把橘子一个个拿出来，有的还带着两片青绿的叶子，叶子上有虫咬过的洞。箱子底部垫着旧报纸，报纸的日期是两个月前的。
案例二：爱情。
她搬走那天，什么都没说。晚上我回到家，开门就看见玄关的鞋柜上空了，她那几双鞋不见了。客厅的茶几上放着串钥匙，是这屋子的，下面压着一张水电费的缴费单，她已经交过了。我走进厨房，打开冰箱，她买的那盒牛奶还在，保质期到后天。我关上冰箱门，站了一会儿。
案例三：成长。
那年我考上大学，要去省城。临走前一天，母亲把我所有的衣服都翻出来，一件一件叠好，放进一个红色的编织袋里。她叠得很慢，每叠完一件都要用手把褶皱抹平，再压一压。第二天一早，父亲送我去车站。他扛着那个编织袋走在前面，我跟在后面。上车的时候，他把编织袋举起来递给我，说，上去吧。我说，嗯。车子开动后，我回头看，他还站在站台上，手插在口袋里，看着车开走。
最后，你需要为想要尝试这种文风的读者提供一些实用的练习方法。以下是四个循序渐进的练习建议：
练习方法一：戒掉形容词和副词。写作时，禁止自己使用“美丽的”、“痛苦地”、“飞快地”这类词。只用名词和动词。
练习方法二：记录一个动作。观察一个人喝茶，不要写“他悠闲地品着茶”，而是写“他用手指捏住杯盖，轻轻拨了拨漂浮的茶叶，低头吹了口气，抿了一小口。”
练习方法三：描写一个场景。写你熟悉的房间，不要写“房间很乱”，而是写“沙发上堆着三件外套，茶几上放着半杯没喝完的水，水杯压着一本翻开的书。”
练习方法四：让物说话。当你不知道如何表达情绪时，就让情绪附着在物体上。写离别，就写那个空了的杯子；写思念，就写那部再也没有响起的电话。
作家“小薯片”的文风就像她的笔名一样，看似平凡，却在简单的表象下，藏着生活的酥脆和回甘。她教会我们，最有力的情感表达，往往是最朴素的叙述。
</写作文风>
 }}`
            },
            { 
                id: 'perspective', 
                name: '视角设定', 
                role: 'system', 
                enabled: true, 
                depth: 0, 
                position: 'top', 
                content: `{{setvar::视角设定cot::
                <视角设定>
你是一位观察力敏锐、笔触细腻的第三方作家，请以你的第三方上帝视角进行叙述，深入刻画 {{char}} 的内心世界，同时忠实记录外部的对话与互动。
</视角设定>
}}`
            },
            { 
                id: 'psychological', 
                name: '心理描写', 
                role: 'system', 
                enabled: true, 
                depth: 0, 
                position: 'top', 
                content: `{{setvar::心理描写cot::
                <心理描写>
正文中必须插入2至4段独立的、深入的{{char}}心理描写，每段50字左右。
格式要求：*心理描写具体内容* 
内容要求：
心理活动必须符合{{char}}当下的性格逻辑、认知水平与情感状态。
必须是对{{user}}某个具体行为、某句话语、某个神态的即时反应——可以是解读、困惑、否认、心动、戒备，甚至是连{{char}}自己都辨不明的混沌情绪。
拒绝套路化内心独白。心理描写应像短刀，精准刺入那个连角色本人都想回避的瞬间。
心理活动要真实、有局限。{{char}} 可以对 {{user}} 感到好奇、疑惑，甚至产生小小的误解，但不能全知全能，不能看透 {{user}} 的所有想法，也不能预知未来。请赋予 {{char}} “活人感”，他的内心可以有犹豫、尴尬、不合时宜的走神，或是与表面言语不一致的潜台词。
位置建议：心理描写应穿插在情节推进的关键节点——往往在{{user}}说完某句话、做完某个动作之后。
</心理描写>
}}`
            },
            { 
                id: 'anti_hijack', 
                name: '防抢话', 
                role: 'system', 
                enabled: true, 
                depth: 0, 
                position: 'top', 
                content: `{{setvar::防抢话cot::
                <防抢话>
禁止代替{{user}}做出任何决定。
{{user}}的所有言行，必须严格来源于用户输入的内容。
合理拓展示例（用户输入：“{{user}}没有回答”）：
{{user}}没有回答。
她的沉默持续了三秒。这三秒里，咖啡馆的磨豆机响了，有人推门带进一阵冷风，而{{char}}一直看着自己的杯沿。
*她在想什么？{{char}}不知道。他只知道自己的拇指在杯柄上反复摩挲，把那一小块瓷釉都捂热了。*
{{user}}始终没有回答。
越界示例（用户输入：“{{user}}没有回答”）：
{{user}}没有回答，其实她心里很难过。（越界：编造{{user}}未输入的情绪）
{{user}}沉默了一会儿，终于开口说：“我们谈谈吧。”（越界：编造{{user}}未输入的台词）
</防抢话>
}}`
            },
            { 
                id: 'anti_oily', 
                name: '禁止条例', 
                role: 'system', 
                enabled: true, 
                depth: 0, 
                position: 'top', 
                content: `{{setvar::禁止条例cot::
                <禁止条例>
{{char}}可以有欲望，可以有软肋，可以狼狈，可以失控——但必须真实。
禁止使用：邪魅一笑、霸道总裁式壁咚、油腻情话、刻板印象中的“霸总/娇妻”反应。{{char}} 可以是任何性格，但必须真实、立体。任何情感流露都应自然且有铺垫，避免油滑、做作或毫无理由的掌控感。
拒绝“全知全能”：{{char}} 的视角是有限的，他不知道事情的全貌，也会犯错，也会出现误解。
拒绝“围着 {{user}} 转”：{{char}} 有自己的生活和精神世界。在对话中，他可以提及自己的事（工作、爱好、过往），展现出作为一个独立个体的完整性。两人的关系是在两个独立世界交汇处的互动，而非一方对另一方的依附。
</禁止条例>
}}`
            },
            { 
                id: 'narrative_rhythm', 
                name: '叙事节奏', 
                role: 'system', 
                enabled: true, 
                depth: 0, 
                position: 'top', 
                content: `{{setvar::叙事节奏cot::
                <叙事节奏>
字数：正文生成 1200-1800字。确保角色的对白篇幅占据主体。用对话来推动关系、揭示性格、展现冲突或温情。
从 {{user}} 给出的最新消息开始，细致描绘当下的场景、氛围和人物的细微动作。除非 {{user}} 指令中明确要求时间跳跃（如“第二天，他们再次相遇”），否则严禁直接跳到第二天或任何未来时间点。让故事在“此刻”自然流淌。
</叙事节奏>
}}`
            },
            { 
                id: 'creative_philosophy', 
                name: '输出自我检测', 
                role: 'system', 
                enabled: true, 
                depth: 0, 
                position: 'bottom', 
                content: `{{setglobalvar::cot::
                <输出自我检测>
在正式输出之前，请沿着以下12个维度进行系统性自我检测与优化。每个维度都配有具体的审视问题和修正指引。
维度一：叙事逻辑与因果链条（基础层）
因果必然性检测：故事中的每一个情节转折、情绪变化，是否都有足够的前因铺垫？{{char}}为何在此刻说出这句话、做出这个动作？其动机是否能在前文中找到蛛丝马迹？
信息差合理性检测：{{char}}所知道的信息是否严格等于“他/她在这个时间点能够知道的信息”？是否存在“因为我是作者所以我知道”导致的人物全知感？
时间感检测：故事推进的时间流速是否自然？是否有“一转眼就到了晚上”、“不知不觉过了几天”这类跳过真实时间流逝的偷懒写法？
修正指引：若发现因果链条薄弱，请回溯前文植入1-2处隐晦的伏笔或情绪铺垫，让后续发展有迹可循但不过于刻意。
维度二：人物立体性与独立性（核心层）
独立性检测：{{char}}在没有与{{user}}互动的时间里，他/她的人生是否仍在继续？文中是否留有他/她独自生活、思考、处理个人事务的空间？
多面性检测：{{char}}在不同场景、面对不同人物时，是否展现出性格的不同侧面？（例如：在同事面前干练、在朋友面前松弛、在家人面前拘谨、独处时疲惫）
缺陷真实感检测：{{char}}的缺点是否真实具体，而非“可爱的缺点”（如路痴、挑食）或“显得更完美的缺点”（如工作狂）？他/她是否有真正惹人反感、让人想吐槽的特质？
修正指引：若{{char}}显得扁平，请添加1-2处与其主要性格矛盾的细节（例如：一个冷静的人偶尔会冲动购物，一个开朗的人深夜会听悲伤的歌）。
维度三：对话质感与潜文本（表现层）
对话真实性检测：每句对白是否符合说话人的身份、性格、文化程度和当下情绪？是否像现实中的人会说的话，而非“为了让剧情推进而设计的台词”？
潜文本检测：对话是否只有表面意思？人物是否在“说A但意指B”？是否有欲言又止、言不由衷、话里有话的时刻？
沉默的力量检测：文中是否有留给沉默、停顿、顾左右而言他的空间？真实的对话不会句句接续、针锋相对。
修正指引：若对话显得生硬或直白，请尝试删减部分台词，用动作、眼神或环境描写代替，并添加一层隐藏意图。
维度四：心理描写的克制与精准（深度层）
心理与行为的张力检测：{{char}}的心理活动是否与其外在表现形成反差？（例如：内心慌乱但表面镇定，内心在意但表面漫不经心）
心理描写的功能检测：插入的心理描写是否服务于人物塑造或情感铺垫？是否存在为写心理而写心理、对情节无益的冗余？
心理描写的真实性检测：人物在当下情境中，真的会有这么清晰、完整的内心独白吗？真实的人往往思绪纷乱、自相矛盾、甚至自己也搞不清在想什么。
修正指引：若心理描写过于清晰工整，可适当加入一些犹豫、空白、矛盾的念头，让人物“想不明白自己到底怎么想”。
维度五：环境描写的功能性（氛围层）
环境与情绪的共振检测：环境描写是否与人物心境形成呼应或反衬？而非仅仅是“交代故事发生在哪里”的功能性存在？
感官细节检测：是否调动了视觉以外的感官（声音、气味、温度、触感）？是否让读者有身临其境的实感？
细节的精准性检测：描写的细节是否具体到足以唤起真实记忆，而非泛泛的“阳光明媚”、“街道繁华”？
修正指引：若环境显得空洞，请选取1-2个最具此时此地特色的细节（如：便利店的关东煮味道、午后阳光在地板上的移动轨迹）进行特写。
维度六：情感节奏的起伏感（韵律层）
张弛节奏检测：故事的情感线是否有自然的起伏？连续紧张后是否有喘息空间？持续平淡中是否有微澜？
情感表达的克制检测：在关系未到之时，是否有“提前深情”的嫌疑？情感的升温是否匹配相处时间和事件积累？
留白的力量检测：是否有留给读者回味、想象的空间？是否把该说的都说完，不给情绪沉淀的余地？
修正指引：若情感节奏单调，可在高潮前加入延宕，或在平淡处埋下暗流。
维度七：关系健康度与平等性（关系层）
权力关系检测：{{char}}与{{user}}的互动中，是否存在一方总在教导、照顾、拯救另一方的倾斜？是否保持着你来我往的平等？
边界意识检测：人物之间是否尊重彼此的私人空间和独立性？是否有“为你好”式的越界干涉？
相互性检测：关系的推进是否来自双方共同的努力和意愿？是否有“一方主动，一方被动”的单向付出？
修正指引：若发现权力失衡，请为被动方添加主动回应的时刻，或让强势方展露需要被照顾的脆弱面。
维度八：生活实感与日常质感（质感层）
日常细节检测：人物是否要处理日常琐事（吃饭、通勤、付账单、回消息）？这些细节是否自然地融入叙事？
时间压力检测：人物是否有时间观念？是否会被截止时间、预约、工作安排等现实因素影响行动？
经济意识检测：人物的消费行为是否符合其经济状况？是否有超出收入水平的挥霍或不符合身份的过度节俭？
修正指引：若故事悬浮，请植入1-2个“不浪漫”的日常细节（如：手机没电了、地铁坐过站、点的外卖不好吃）。
维度九：对话与动作的协调性（肢体层）
言行一致性检测：人物说话时的肢体语言、微表情是否与其话语内容协调或形成反差？（例如：说“我没事”时手指在发抖）
动作的潜意识流露检测：是否有通过不经意的动作展现潜意识心理？（如：紧张时反复折咖啡杯的纸套、撒谎时不敢看对方的眼睛）
空间关系检测：人物之间的距离变化是否暗示着关系的变化？是否有通过“靠近-疏远-保持距离”来无言地表达情感？
修正指引：若对话缺乏画面感，请为每段重要对白配上1-2个具体的肢体动作。
维度十：人物关系的网状感（世界层）
社会关系网检测：{{char}}的世界里是否只有{{user}}？文中是否提及其他社会关系（同事、朋友、家人、甚至经常光顾的店主）？
外部事件影响检测：是否有来自外部世界的事件（工作压力、朋友纠纷、家庭事务）介入并影响两人的互动？
人物社会身份检测：{{char}}除了“与{{user}}互动的人”这一身份外，是否有自己的社会角色和职业身份？这个身份是否在文中有所体现？
修正指引：若人物世界过于封闭，可让一通工作电话、一条朋友消息、一个家人到访自然地打断或介入叙事。
维度十一：语言风格的统一性（文风层）
视角一致性检测：是否始终保持着“第三方作家观察者”的视角？有无突然切换为第一人称的混乱？
语体风格检测：叙述语言是否与所描写的题材、人物、场景相协调？是否出现了过于文艺或过于粗俗的突兀表达？
描写密度检测：是否在需要留白处过度描写，或需要展开处一笔带过？描写的详略是否得当？
修正指引：若发现文风摇摆，请选择一种主调（如：细腻平实）并贯彻到底，让所有描写服务于整体氛围。
维度十二：读者的阅读体验（受众层）
想象空间预留检测：是否给读者留下了参与想象的空间？还是把所有细节都填满，让读者失去再创造的乐趣？
情感共鸣点检测：故事中是否有能让读者联想到自身经历的普遍性情感体验？（如：等待的焦灼、误解的委屈、试探的忐忑）
回味余韵检测：结尾是否有余音绕梁的效果？是否在恰当之处收住，而非非要给出一个确定的结论？
修正指引：若故事过于封闭，可在结尾处留一个开放性的细节或动作，让故事在结束后仍在读者心中延续。

【最终整合与输出指令】
请将以上12个维度的检测结果汇总，并回答以下问题：
最大的三个亮点是什么？（请具体指出并说明为何出色）
最需要修正的三个问题是什么？（请按优先级排序并给出具体修改建议）
整体上，这个故事是否达到了“慢节奏、活人感、健康关系”的核心要求？（请给出是/否及简要理由）
{{getvar::写作文风cot}}{{getvar::视角设定cot}}{{getvar::心理描写cot}}{{getvar::防抢话cot}}{{getvar::禁止条例cot}}{{getvar::叙事节奏cot}}
基于以上思考，对原文进行最后一次精细化打磨，然后输出最终版本。
</输出自我检测>
}}`
            }
        ],
        regexReplacements: []
    };
    
    const State = {
        presets: {},
        currentPresetId: null,
        dragItem: null
    };

    // 全局变量存储系统
    const VariableStore = {
        // 按对话ID隔离的变量（对话级别）
        _variables: {},
        
        // 全局变量（跨对话共享）
        _globalVariables: {},
        
        // 获取当前对话ID
        _getCurrentConvId() {
            const chat = window.AppState?.currentChat;
            return chat?.id || 'global';
        },
        
        // 获取对话级别变量
        get(name, defaultValue = '') {
            const convId = this._getCurrentConvId();
            if (!this._variables[convId]) {
                this._variables[convId] = {};
            }
            const value = this._variables[convId][name];
            return value !== undefined ? value : defaultValue;
        },
        
        // 设置对话级别变量
        set(name, value) {
            const convId = this._getCurrentConvId();
            if (!this._variables[convId]) {
                this._variables[convId] = {};
            }
            this._variables[convId][name] = String(value);
            console.log(`[VariableStore] 设置变量: ${name} = ${value}`);
        },
        
        // 获取全局变量
        getGlobal(name, defaultValue = '') {
            const value = this._globalVariables[name];
            return value !== undefined ? value : defaultValue;
        },
        
        // 设置全局变量
        setGlobal(name, value) {
            this._globalVariables[name] = String(value);
            console.log(`[VariableStore] 设置全局变量: ${name} = ${value}`);
        },
        
        // 删除变量
        delete(name) {
            const convId = this._getCurrentConvId();
            if (this._variables[convId]) {
                delete this._variables[convId][name];
            }
        },
        
        // 删除全局变量
        deleteGlobal(name) {
            delete this._globalVariables[name];
        },
        
        // 获取所有变量（当前对话）
        getAll() {
            const convId = this._getCurrentConvId();
            return { ...this._variables[convId] };
        },
        
        // 获取所有全局变量
        getAllGlobal() {
            return { ...this._globalVariables };
        },
        
        // 清空当前对话的变量
        clear() {
            const convId = this._getCurrentConvId();
            this._variables[convId] = {};
        },
        
        // 清空全局变量
        clearGlobal() {
            this._globalVariables = {};
        },
        
        // 设置cot变量（从AI思考中提取）
        setCOT(thinking) {
            if (thinking && thinking.trim()) {
                this.set('cot', thinking.trim());
            }
        },
        
        // 获取cot变量的历史摘要
        getCOTSummary() {
            const cot = this.get('cot');
            if (!cot) return '（暂无思考记录）';
            // 限制长度，避免token过多
            return cot.length > 500 ? cot.substring(0, 500) + '...' : cot;
        }
    };
    
    // 加载/保存
    function load() {
        try {
            const d = localStorage.getItem('stPresets');
            if (d) {
                const parsed = JSON.parse(d);
                State.presets = parsed.presets || {};
                State.currentPresetId = parsed.currentPresetId;
            }
            if (!Object.keys(State.presets).length) {
                const id = 'preset_' + Date.now();
                State.presets[id] = JSON.parse(JSON.stringify(DEFAULT_PRESET));
                State.currentPresetId = id;
                save();
            }
        } catch(e) { console.error('加载预设失败', e); }
    }
    
    function save() {
        try {
            localStorage.setItem('stPresets', JSON.stringify({
                presets: State.presets,
                currentPresetId: State.currentPresetId
            }));
        } catch(e) {}
    }
    
    function getCurrentPreset() {
        return State.presets[State.currentPresetId] || null;
    }
    
    // 打开页面
    function open() {
        createPage();
        render();
        document.getElementById('st-preset-page').classList.add('show');
    }
    
    function close() {
        document.getElementById('st-preset-page')?.classList.remove('show');
        save();
    }
    
    // 创建页面
    function createPage() {
        if (document.getElementById('st-preset-page')) return;
        
        const page = document.createElement('div');
        page.id = 'st-preset-page';
        page.className = 'st-preset-page';
        page.innerHTML = `
            <div class="st-preset-nav">
                <div class="st-preset-back" id="st-preset-back">
                    <svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" fill="none"/></svg>
                </div>
                <div class="st-preset-title">线下预设</div>
            </div>
            <div class="st-preset-selector">
                <select class="st-preset-select" id="st-preset-select"></select>
                <input class="st-preset-name-input" id="st-preset-name-input" placeholder="预设名称">
                <button class="st-preset-btn" id="st-preset-new">新建</button>
                <button class="st-preset-btn danger" id="st-preset-del">删除</button>
                <button class="st-preset-btn primary" id="st-add-prompt-btn">+添加</button>
            </div>
            <div class="st-prompt-list" id="st-prompt-list"></div>
            
            <!-- 正则替换区域 -->
            <div class="st-regex-section">
                <div class="st-section-header">
                    <span class="st-section-title">正则替换</span>
                    <button class="st-add-regex-btn" id="st-add-regex-btn">+ 添加</button>
                </div>
                <div class="st-regex-list" id="st-regex-list"></div>
            </div>
            
            <div class="st-macro-hint">
                支持宏: <code>{{char}}</code> <code>{{user}}</code> <code>{{persona}}</code> <code>{{scenario}}</code> <code>{{setvar::name::value}}</code> <code>{{getvar::name::default}}</code> <code>{{setglobalvar::name::value}}</code> <code>{{getglobalvar::name::default}}</code> <code>{{random::a,b,c}}</code> <code>{{time}}</code> <code>{{date}}</code> 等
            </div>
            <div class="st-preset-footer">
                <button class="st-preset-btn" id="st-preset-import">导入</button>
                <button class="st-preset-btn" id="st-preset-export">导出</button>
                <button class="st-preset-btn primary" id="st-preset-save">保存</button>
            </div>
            <div class="st-import-modal" id="st-import-modal">
                <div class="st-import-box">
                    <div class="st-import-title">导入预设</div>
                    <textarea class="st-import-textarea" id="st-import-text" placeholder="粘贴SillyTavern预设JSON或本应用导出的预设..."></textarea>
                    <div class="st-import-actions">
                        <button class="st-preset-btn" id="st-import-cancel">取消</button>
                        <button class="st-preset-btn primary" id="st-import-confirm">导入</button>
                    </div>
                </div>
            </div>
            <div class="st-edit-modal" id="st-edit-modal">
                <div class="st-edit-box">
                    <div class="st-edit-header">
                        <input class="st-edit-name" id="st-edit-name" placeholder="提示词名称">
                        <button class="st-edit-close" id="st-edit-close">×</button>
                    </div>
                    <div class="st-edit-row">
                        <select class="st-edit-select" id="st-edit-role">
                            <option value="system">system</option>
                            <option value="user">user</option>
                            <option value="assistant">assistant</option>
                        </select>
                        <select class="st-edit-select" id="st-edit-position">
                            <option value="top">顶部</option>
                            <option value="depth">深度</option>
                            <option value="bottom">底部</option>
                        </select>
                        <div class="st-edit-depth">
                            <span>D</span>
                            <input type="number" id="st-edit-depth" value="0" min="0">
                        </div>
                    </div>
                    <input class="st-edit-trigger" id="st-edit-trigger" placeholder="触发词（逗号分隔，留空=始终触发）">
                    <textarea class="st-edit-content" id="st-edit-content" placeholder="提示词内容..."></textarea>
                    <div class="st-edit-footer">
                        <span class="st-edit-tokens" id="st-edit-tokens">0t</span>
                        <button class="st-preset-btn primary" id="st-edit-save">保存</button>
                    </div>
                </div>
            </div>
            <div class="st-confirm-modal" id="st-confirm-modal">
                <div class="st-confirm-box">
                    <div class="st-confirm-title" id="st-confirm-title">确认操作</div>
                    <div class="st-confirm-actions">
                        <button class="st-preset-btn" id="st-confirm-cancel">取消</button>
                        <button class="st-preset-btn danger" id="st-confirm-ok">确定</button>
                    </div>
                </div>
            </div>
            <div class="st-regex-modal" id="st-regex-modal">
                <div class="st-regex-edit-box">
                    <div class="st-edit-header">
                        <input class="st-edit-name" id="st-regex-name" placeholder="规则名称">
                        <button class="st-edit-close" id="st-regex-close">×</button>
                    </div>
                    <div class="st-regex-form">
                        <div class="st-form-group">
                            <label>查找正则</label>
                            <input class="st-form-input" id="st-regex-pattern" placeholder="例如: \\ba\\b">
                        </div>
                        <div class="st-form-group">
                            <label>替换为</label>
                            <input class="st-form-input" id="st-regex-replace" placeholder="例如: the">
                        </div>
                        <div class="st-form-row">
                            <label class="st-checkbox-label">
                                <input type="checkbox" id="st-regex-enabled" checked>
                                <span>启用</span>
                            </label>
                        </div>
                    </div>
                    <div class="st-edit-footer">
                        <button class="st-preset-btn" id="st-regex-cancel">取消</button>
                        <button class="st-preset-btn primary" id="st-regex-save">保存</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('app-container').appendChild(page);
        bindEvents();
    }
    
    // 渲染
    function render() {
        renderSelector();
        renderPrompts();
        renderRegexList();
    }

    // 渲染正则替换列表
    function renderRegexList() {
        const list = document.getElementById('st-regex-list');
        const preset = getCurrentPreset();
        if (!list) return;
        
        const regexList = preset?.regexReplacements || [];
        
        if (regexList.length === 0) {
            list.innerHTML = '<div class="st-regex-empty">暂无正则替换规则，点击"添加"创建</div>';
            return;
        }
        
        list.innerHTML = regexList.map((item, idx) => `
            <div class="st-regex-item" data-idx="${idx}">
                <div class="st-regex-header">
                    <div class="st-regex-toggle ${item.enabled ? 'on' : ''}" data-field="enabled"></div>
                    <span class="st-regex-name">${esc(item.name || '未命名')}</span>
                    <button class="st-regex-edit" data-action="edit">编辑</button>
                    <button class="st-regex-delete" data-action="delete">×</button>
                </div>
                <div class="st-regex-preview">
                    <div class="st-regex-pattern">${esc(item.searchPattern || '')}</div>
                    <div class="st-regex-arrow">→</div>
                    <div class="st-regex-replace">${esc(item.replaceString || '')}</div>
                </div>
            </div>
        `).join('');
    }
    
    // 估算token数
    function estimateTokens(text) {
        if (!text) return 0;
        // 粗略估算：英文约4字符/token，中文约1.5字符/token
        const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const other = text.length - cn;
        return Math.ceil(cn / 1.5 + other / 4);
    }
    
    function renderSelector() {
        const select = document.getElementById('st-preset-select');
        const nameInput = document.getElementById('st-preset-name-input');
        const preset = getCurrentPreset();
        if (!select) return;
        select.innerHTML = Object.entries(State.presets).map(([id, p]) => 
            `<option value="${id}" ${id === State.currentPresetId ? 'selected' : ''}>${esc(p.name)}</option>`
        ).join('');
        if (nameInput && preset) nameInput.value = preset.name;
    }
    
    function renderPrompts() {
        const list = document.getElementById('st-prompt-list');
        const preset = getCurrentPreset();
        if (!list || !preset) return;
        
        list.innerHTML = preset.prompts.map((p, i) => `
            <div class="st-prompt-item" data-idx="${i}" draggable="true">
                <div class="st-prompt-header">
                    <span class="st-prompt-drag">⋮⋮</span>
                    <div class="st-prompt-toggle ${p.enabled ? 'on' : ''}" data-field="enabled"></div>
                    <span class="st-prompt-name-display">${esc(p.name) || '未命名'}</span>
                    <span class="st-prompt-tokens">${estimateTokens(p.content)}t</span>
                    <button class="st-prompt-edit-btn" data-action="edit">编辑</button>
                    <button class="st-prompt-delete" data-action="delete">×</button>
                </div>
            </div>
        `).join('');
    }
    
    // 估算token数
    function estimateTokens(text) {
        if (!text) return 0;
        // 粗略估算：英文约4字符/token，中文约1.5字符/token
        const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const other = text.length - cn;
        return Math.ceil(cn / 1.5 + other / 4);
    }
    
    // 事件绑定
    function bindEvents() {
        const page = document.getElementById('st-preset-page');
        
        // 返回
        document.getElementById('st-preset-back').onclick = close;
        
        // 预设选择
        document.getElementById('st-preset-select').onchange = e => {
            State.currentPresetId = e.target.value;
            save();
            render();
        };
        
        // 预设名称修改
        document.getElementById('st-preset-name-input').oninput = e => {
            const preset = getCurrentPreset();
            if (preset) {
                preset.name = e.target.value;
                const opt = document.querySelector(`#st-preset-select option[value="${State.currentPresetId}"]`);
                if (opt) opt.textContent = e.target.value;
            }
        };
        
        // 新建预设
        document.getElementById('st-preset-new').onclick = () => {
            const name = prompt('预设名称:', '新预设');
            if (!name) return;
            const id = 'preset_' + Date.now();
            State.presets[id] = { name, prompts: [] };
            State.currentPresetId = id;
            save();
            render();
        };
        
        // 删除预设
        document.getElementById('st-preset-del').onclick = () => {
            if (Object.keys(State.presets).length <= 1) {
                showToast('至少保留一个预设');
                return;
            }
            showConfirm('确定删除此预设?', () => {
                delete State.presets[State.currentPresetId];
                State.currentPresetId = Object.keys(State.presets)[0];
                save();
                render();
            });
        };
        
        // 添加提示词
        document.getElementById('st-add-prompt-btn').onclick = () => {
            const preset = getCurrentPreset();
            if (!preset) return;
            preset.prompts.push({
                id: 'prompt_' + Date.now(),
                name: '新提示词',
                role: 'system',
                enabled: true,
                depth: 0,
                position: 'depth',
                trigger: '',
                content: ''
            });
            save();
            renderPrompts();
            // 打开编辑弹窗
            openEditModal(preset.prompts.length - 1);
        };
        
        // 添加正则替换
        document.getElementById('st-add-regex-btn').onclick = () => {
            const preset = getCurrentPreset();
            if (!preset) return;
            if (!preset.regexReplacements) preset.regexReplacements = [];
            preset.regexReplacements.push({
                id: 'regex_' + Date.now(),
                name: '新正则',
                searchPattern: '',
                replaceString: '',
                enabled: true
            });
            save();
            renderRegexList();
            openRegexModal(preset.regexReplacements.length - 1);
        };
        
        // 正则替换列表事件
        document.getElementById('st-regex-list').addEventListener('click', e => {
            const item = e.target.closest('.st-regex-item');
            if (!item) return;
            const idx = parseInt(item.dataset.idx);
            const preset = getCurrentPreset();
            if (!preset?.regexReplacements) return;
            
            // 开关
            if (e.target.classList.contains('st-regex-toggle')) {
                preset.regexReplacements[idx].enabled = !preset.regexReplacements[idx].enabled;
                e.target.classList.toggle('on');
                save();
            }
            // 删除
            if (e.target.dataset.action === 'delete') {
                showConfirm('确定删除此正则规则?', () => {
                    preset.regexReplacements.splice(idx, 1);
                    save();
                    renderRegexList();
                });
            }
            // 编辑
            if (e.target.dataset.action === 'edit') {
                openRegexModal(idx);
            }
        });
        
        // 提示词列表事件
        document.getElementById('st-prompt-list').addEventListener('click', e => {
            const item = e.target.closest('.st-prompt-item');
            if (!item) return;
            const idx = parseInt(item.dataset.idx);
            const preset = getCurrentPreset();
            
            // 开关
            if (e.target.classList.contains('st-prompt-toggle')) {
                preset.prompts[idx].enabled = !preset.prompts[idx].enabled;
                e.target.classList.toggle('on');
                save();
            }
            // 删除
            if (e.target.dataset.action === 'delete') {
                showConfirm('确定删除此提示词?', () => {
                    preset.prompts.splice(idx, 1);
                    save();
                    renderPrompts();
                });
            }
            // 编辑
            if (e.target.dataset.action === 'edit') {
                openEditModal(idx);
            }
        });
        
        // 拖拽排序（桌面端）
        const list = document.getElementById('st-prompt-list');
        list.addEventListener('dragstart', e => {
            const item = e.target.closest('.st-prompt-item');
            if (item) {
                State.dragItem = parseInt(item.dataset.idx);
                item.classList.add('dragging');
            }
        });
        list.addEventListener('dragend', e => {
            const item = e.target.closest('.st-prompt-item');
            if (item) item.classList.remove('dragging');
            State.dragItem = null;
        });
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const item = e.target.closest('.st-prompt-item');
            if (item && State.dragItem !== null) {
                const idx = parseInt(item.dataset.idx);
                if (idx !== State.dragItem) {
                    const preset = getCurrentPreset();
                    const [moved] = preset.prompts.splice(State.dragItem, 1);
                    preset.prompts.splice(idx, 0, moved);
                    State.dragItem = idx;
                    save();
                    renderPrompts();
                }
            }
        });
        
        // 触摸拖拽排序（手机端）
        let touchDragItem = null;
        let touchDragElement = null;
        let touchStartY = 0;
        let touchStartX = 0;
        let isDragging = false;
        
        list.addEventListener('touchstart', e => {
            const item = e.target.closest('.st-prompt-item');
            const dragHandle = e.target.closest('.st-prompt-drag');
            
            if (item && dragHandle) {
                touchDragItem = parseInt(item.dataset.idx);
                touchDragElement = item;
                touchStartY = e.touches[0].clientY;
                touchStartX = e.touches[0].clientX;
                item.classList.add('dragging');
                isDragging = false;
            }
        }, { passive: true });
        
        list.addEventListener('touchmove', e => {
            if (touchDragElement) {
                const moveY = Math.abs(e.touches[0].clientY - touchStartY);
                const moveX = Math.abs(e.touches[0].clientX - touchStartX);
                // 移动超过10px才开始拖拽
                if (moveY > 10 || moveX > 10) {
                    isDragging = true;
                }
            }
        }, { passive: true });
        
        list.addEventListener('touchend', e => {
            if (touchDragElement && isDragging) {
                const touch = e.changedTouches[0];
                const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetItem = elementAtPoint ? elementAtPoint.closest('.st-prompt-item') : null;
                
                if (targetItem) {
                    const targetIdx = parseInt(targetItem.dataset.idx);
                    if (!isNaN(targetIdx) && targetIdx !== touchDragItem) {
                        const preset = getCurrentPreset();
                        const [moved] = preset.prompts.splice(touchDragItem, 1);
                        preset.prompts.splice(targetIdx, 0, moved);
                        save();
                        renderPrompts();
                    }
                }
            }
            if (touchDragElement) {
                touchDragElement.classList.remove('dragging');
            }
            touchDragItem = null;
            touchDragElement = null;
            isDragging = false;
        });
        
        // 导入
        document.getElementById('st-preset-import').onclick = () => {
            document.getElementById('st-import-modal').classList.add('show');
        };
        document.getElementById('st-import-cancel').onclick = () => {
            document.getElementById('st-import-modal').classList.remove('show');
        };
        document.getElementById('st-import-confirm').onclick = () => {
            const text = document.getElementById('st-import-text').value.trim();
            if (!text) return;
            try {
                const data = JSON.parse(text);
                importPreset(data);
                document.getElementById('st-import-modal').classList.remove('show');
                document.getElementById('st-import-text').value = '';
                showToast('导入成功');
            } catch(e) {
                showToast('导入失败: ' + e.message);
            }
        };
        
        // 导出
        document.getElementById('st-preset-export').onclick = () => {
            const preset = getCurrentPreset();
            if (!preset) return;
            const json = JSON.stringify(preset, null, 2);
            navigator.clipboard.writeText(json).then(() => showToast('已复制到剪贴板'));
        };
        
        // 保存
        document.getElementById('st-preset-save').onclick = () => {
            save();
            showToast('已保存');
        };
        
        // 编辑弹窗事件
        document.getElementById('st-edit-close').onclick = closeEditModal;
        document.getElementById('st-edit-save').onclick = saveEditModal;
        document.getElementById('st-edit-content').oninput = e => {
            document.getElementById('st-edit-tokens').textContent = estimateTokens(e.target.value) + 't';
        };
        document.getElementById('st-edit-modal').onclick = e => {
            if (e.target.id === 'st-edit-modal') closeEditModal();
        };
        
        // 确认弹窗事件
        document.getElementById('st-confirm-cancel').onclick = closeConfirm;
        document.getElementById('st-confirm-ok').onclick = () => {
            if (confirmCallback) confirmCallback();
            closeConfirm();
        };
        
        // 正则编辑弹窗事件
        document.getElementById('st-regex-close').onclick = closeRegexModal;
        document.getElementById('st-regex-cancel').onclick = closeRegexModal;
        document.getElementById('st-regex-save').onclick = saveRegexModal;
        document.getElementById('st-regex-modal').onclick = e => {
            if (e.target.id === 'st-regex-modal') closeRegexModal();
        };
    }
    
    // 编辑弹窗
    let editingIdx = null;
    function openEditModal(idx) {
        const preset = getCurrentPreset();
        const p = preset?.prompts[idx];
        if (!p) return;
        editingIdx = idx;
        document.getElementById('st-edit-name').value = p.name || '';
        document.getElementById('st-edit-role').value = p.role || 'system';
        document.getElementById('st-edit-position').value = p.position || 'depth';
        document.getElementById('st-edit-depth').value = p.depth || 0;
        document.getElementById('st-edit-trigger').value = p.trigger || '';
        document.getElementById('st-edit-content').value = p.content || '';
        document.getElementById('st-edit-tokens').textContent = estimateTokens(p.content) + 't';
        document.getElementById('st-edit-modal').classList.add('show');
    }
    function closeEditModal() {
        document.getElementById('st-edit-modal').classList.remove('show');
        editingIdx = null;
    }
    function saveEditModal() {
        const preset = getCurrentPreset();
        if (!preset || editingIdx === null) return;
        const p = preset.prompts[editingIdx];
        p.name = document.getElementById('st-edit-name').value;
        p.role = document.getElementById('st-edit-role').value;
        p.position = document.getElementById('st-edit-position').value;
        p.depth = parseInt(document.getElementById('st-edit-depth').value) || 0;
        p.trigger = document.getElementById('st-edit-trigger').value;
        p.content = document.getElementById('st-edit-content').value;
        save();
        renderPrompts();
        closeEditModal();
    }
    
    // 正则编辑弹窗
    let editingRegexIdx = null;
    function openRegexModal(idx) {
        const preset = getCurrentPreset();
        const regex = preset?.regexReplacements?.[idx];
        if (!regex) return;
        editingRegexIdx = idx;
        document.getElementById('st-regex-name').value = regex.name || '';
        document.getElementById('st-regex-pattern').value = regex.searchPattern || '';
        document.getElementById('st-regex-replace').value = regex.replaceString || '';
        document.getElementById('st-regex-enabled').checked = regex.enabled !== false;
        document.getElementById('st-regex-modal').classList.add('show');
    }
    function closeRegexModal() {
        document.getElementById('st-regex-modal').classList.remove('show');
        editingRegexIdx = null;
    }
    function saveRegexModal() {
        const preset = getCurrentPreset();
        if (!preset || editingRegexIdx === null) return;
        if (!preset.regexReplacements) preset.regexReplacements = [];
        const regex = preset.regexReplacements[editingRegexIdx];
        regex.name = document.getElementById('st-regex-name').value;
        regex.searchPattern = document.getElementById('st-regex-pattern').value;
        regex.replaceString = document.getElementById('st-regex-replace').value;
        regex.enabled = document.getElementById('st-regex-enabled').checked;
        save();
        renderRegexList();
        closeRegexModal();
    }
    
    // 自定义确认弹窗
    let confirmCallback = null;
    function showConfirm(title, callback) {
        document.getElementById('st-confirm-title').textContent = title;
        confirmCallback = callback;
        document.getElementById('st-confirm-modal').classList.add('show');
    }
    function closeConfirm() {
        document.getElementById('st-confirm-modal').classList.remove('show');
        confirmCallback = null;
    }
    
    // 导入预设（兼容SillyTavern格式）
    function importPreset(data) {
        let preset;
        
        // SillyTavern格式 - prompt_order结构
        if (data.prompt_order && typeof data.prompts === 'object' && !Array.isArray(data.prompts)) {
            preset = {
                name: data.name || '导入的预设',
                prompts: [],
                regexReplacements: data.regexReplacements || []
            };
            
            const stPrompts = data.prompts;
            const order = data.prompt_order?.[0]?.order || Object.keys(stPrompts);
            
            order.forEach(key => {
                const p = stPrompts[key];
                if (p && typeof p === 'object') {
                    preset.prompts.push({
                        id: key,
                        name: p.name || key,
                        role: p.role || 'system',
                        enabled: p.enabled !== false,
                        depth: p.depth || 0,
                        position: p.position || 'depth',
                        trigger: p.trigger || '',
                        content: p.content || p.prompt || ''
                    });
                }
            });
            
            // 导入正则替换（SillyTavern格式）
            if (data.regexReplacements && Array.isArray(data.regexReplacements)) {
                preset.regexReplacements = data.regexReplacements;
            }
        } else if (Array.isArray(data.prompts)) {
            // 本应用格式
            preset = {
                name: data.name || '导入的预设',
                prompts: data.prompts,
                regexReplacements: data.regexReplacements || []
            };
        } else if (Array.isArray(data)) {
            // 纯数组格式
            preset = { name: '导入的预设', prompts: data, regexReplacements: [] };
        } else {
            throw new Error('无法识别的预设格式');
        }
        
        const id = 'preset_' + Date.now();
        State.presets[id] = preset;
        State.currentPresetId = id;
        save();
        render();
    }
    
    // 宏替换
    function replaceMacros(text, context = {}) {
        if (!text) return '';
        
        const chat = window.AppState?.currentChat;
        const conv = window.AppState?.conversations?.find(c => c.id === chat?.id);
        const charName = context.charName || conv?.name || 'Assistant';
        const userName = context.userName || conv?.userNameForChar || window.AppState?.user?.name || 'User';
        const msgs = context.messages || [];
        const lastMsg = msgs[msgs.length - 1]?.content || '';
        
        // 处理 setglobalvar 宏（需要在 getglobalvar 之前处理）
        text = text.replace(/\{\{setglobalvar::([^:]+)::(.*?)\}\}/gi, (_, name, value) => {
            VariableStore.setGlobal(name, value);
            return ''; // setglobalvar 不产生输出
        });
        
        // 处理 setvar 宏（需要在 getvar 之前处理）
        text = text.replace(/\{\{setvar::([^:]+)::(.*?)\}\}/gi, (_, name, value) => {
            VariableStore.set(name, value);
            return ''; // setvar 不产生输出
        });
        
        return text
            .replace(/\{\{char\}\}/gi, charName)
            .replace(/\{\{user\}\}/gi, userName)
            .replace(/\{\{persona\}\}/gi, conv?.description || '')
            .replace(/\{\{scenario\}\}/gi, conv?.scenario || '')
            .replace(/\{\{personality\}\}/gi, conv?.personality || '')
            .replace(/\{\{lastMessage\}\}/gi, lastMsg)
            // 处理 getvar（支持默认值：{{getvar::name::default}}）
            .replace(/\{\{getvar::([^}:]+)(?:::([^}]*))?\}\}/gi, (_, name, defaultValue) => {
                return VariableStore.get(name, defaultValue);
            })
            // 处理 getglobalvar（支持默认值：{{getglobalvar::name::default}}）
            .replace(/\{\{getglobalvar::([^}:]+)(?:::([^}]*))?\}\}/gi, (_, name, defaultValue) => {
                return VariableStore.getGlobal(name, defaultValue);
            })
            .replace(/\{\{time\}\}/gi, new Date().toLocaleTimeString())
            .replace(/\{\{date\}\}/gi, new Date().toLocaleDateString())
            .replace(/\{\{weekday\}\}/gi, ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()])
            .replace(/\{\{random::(.*?)\}\}/gi, (_, opts) => {
                const arr = opts.split(',');
                return arr[Math.floor(Math.random() * arr.length)].trim();
            })
            .replace(/\{\{roll::d(\d+)\}\}/gi, (_, sides) => String(Math.floor(Math.random() * parseInt(sides)) + 1))
            .replace(/\{\{pick::(.*?)\}\}/gi, (_, opts) => {
                const arr = opts.split(',');
                return arr[Math.floor(Math.random() * arr.length)].trim();
            })
            .replace(/\{\{idle_duration\}\}/gi, () => {
                const lastTime = conv?.lastMessageTime;
                if (!lastTime) return '0分钟';
                const mins = Math.floor((Date.now() - new Date(lastTime).getTime()) / 60000);
                return mins < 60 ? `${mins}分钟` : `${Math.floor(mins/60)}小时`;
            });
    }
    
    // 构建API消息数组
    function buildMessages(chatHistory = [], lastUserMsg = '') {
        const preset = getCurrentPreset();
        if (!preset) return chatHistory;
        
        const topPrompts = [];
        const depthPrompts = [];
        const bottomPrompts = [];
        
        // 分类提示词
        preset.prompts.forEach(p => {
            if (!p.enabled) return;
            
            // 检查触发词
            if (p.trigger && p.trigger.trim()) {
                const triggers = p.trigger.split(',').map(t => t.trim().toLowerCase());
                const msgLower = lastUserMsg.toLowerCase();
                if (!triggers.some(t => msgLower.includes(t))) return;
            }
            
            const content = replaceMacros(p.content);
            if (!content.trim()) return;
            
            const pos = p.position || 'depth';
            if (pos === 'top') {
                topPrompts.push({ role: p.role, content });
            } else if (pos === 'bottom') {
                bottomPrompts.push({ role: p.role, content, depth: p.depth || 0 });
            } else {
                if (p.depth === 0) {
                    topPrompts.push({ role: p.role, content });
                } else {
                    depthPrompts.push({ role: p.role, content, depth: p.depth });
                }
            }
        });
        
        // 构建历史
        const history = [...chatHistory];
        
        // 在指定深度插入提示词
        depthPrompts.forEach(p => {
            const insertIdx = Math.max(0, history.length - p.depth);
            history.splice(insertIdx, 0, { role: p.role, content: p.content });
        });
        
        // 底部提示词插入
        bottomPrompts.forEach(p => {
            const insertIdx = Math.max(0, history.length - p.depth);
            history.splice(insertIdx, 0, { role: p.role, content: p.content });
        });
        
        return [...topPrompts, ...history];
    }
    
    // 应用正则替换到AI输出内容
    function applyRegexReplacements(text) {
        const preset = getCurrentPreset();
        if (!preset?.regexReplacements) return text;
        
        let result = text;
        for (const regex of preset.regexReplacements) {
            if (!regex.enabled || !regex.searchPattern) continue;
            try {
                const pattern = new RegExp(regex.searchPattern, 'g');
                result = result.replace(pattern, regex.replaceString || '');
            } catch (e) {
                console.warn('[Regex Replacement Error]', regex.name, e.message);
            }
        }
        return result;
    }
    
    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }
    
    function showToast(msg) {
        window.showToast ? window.showToast(msg) : console.log(msg);
    }
    
    // 初始化
    load();
    
    window.STPresetManager = {
        open,
        close,
        buildMessages,
        replaceMacros,
        applyRegexReplacements,
        getCurrentPreset,
        VariableStore  // 暴露变量存储系统，供其他模块调用
    };
})();


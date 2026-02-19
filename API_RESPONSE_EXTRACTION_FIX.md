# API 响应提取问题修复说明

## 问题描述
主 API 调用时出现错误："❌ 主API调用失败：未在返回中找到文本回复"

虽然 API 端点本身是可用的（HTTP 200），但无法从响应数据中提取文本回复字段。

---

## 修复内容

### 1. 增强的文本提取函数 (`api-utils.js`)

**改进的 `extractTextFromResponse()` 函数**：
- 支持从 responses 数组的多个项中提取（不仅仅是第一项）
- 优先查找常见的内容字段（content, text, message, reply 等）
- 添加了更多可能的一级字段支持：
  - `generated_text`
  - `answer_text` 
  - `result_text`
  - `answer`
  - `completion`
  等

**新增函数**：
- `getValueByPath(obj, path)` - 按路径提取值（如 'choices.0.message.content'）
- `extractTextWithCustomMapping(data, customPaths)` - 支持自定义字段映射

### 2. 改进的错误诊断日志

**主 API 管理器** (`main-api-manager.js`)：
增强的错误输出包含：
```
📊 响应顶级结构:
  - keys: 显示响应的所有键
  - hasChoices: 是否存在 choices
  - hasCandidates: 是否存在 candidates
  - choicesCount: choices 数量

📋 Choices 结构详情:
  - 所有键列表
  - message 字段详情
  - content 字段详情

🎯 Candidates 结构详情 (Gemini 格式):
  - content.parts 结构

📄 完整响应数据 (前 2000 字符)
```

这些详细的日志将帮助诊断 API 返回的具体格式。

### 3. 自定义字段映射功能

**功能说明**：
如果 API 返回的字段格式非标准，用户可以在 API 设置中配置自定义响应字段路径。

**配置字段**（在 `AppState.apiSettings` 中）：
- 主 API：`customResponseFieldPaths` - 多行，每行一个路径
- 副 API：`secondaryCustomResponseFieldPaths` - 多行，每行一个路径

**路径示例**：
- `choices.0.message.content` - OpenAI 格式
- `candidates.0.content.parts.0.text` - Google Gemini 格式
- `data.result` - 自定义格式
- `response.text` - 另一种自定义格式

**使用方式**：
```javascript
// 在 API 设置中（示例）
api.customResponseFieldPaths = `data.answer
result.text
choices.0.message.content`;
```

---

## 诊断步骤

当出现"未在返回中找到文本回复"错误时：

1. **打开浏览器控制台** (F12) → Console 标签

2. **查看详细的诊断信息**：
   ```
   📊 响应顶级结构:
     - keys: [显示 API 返回的字段名]
   ```
   
   记下 API 返回的实际字段名（如 `output`, `data`, `response` 等）

3. **查看完整响应数据**：
   查看 JSON 结构，找到包含实际回复文本的字段路径

4. **配置自定义路径**（如果需要）：
   - 在 API 设置中找到"自定义响应字段路径"选项
   - 输入正确的路径（每行一个）
   - 保存设置后重新调用 API

---

## 支持的 API 格式

以下格式已内置支持：

### OpenAI 格式
```json
{
  "choices": [{
    "message": {
      "content": "回复文本"
    }
  }]
}
```

### Google Gemini 格式
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "回复文本"
      }]
    }
  }]
}
```

### 其他常见格式
```json
{
  "output": "回复文本",
  "result": "回复文本",
  "reply": "回复文本",
  "content": "回复文本",
  "text": "回复文本",
  "message": "回复文本",
  "response": "回复文本"
}
```

### 自定义格式（新增支持）
任何字段路径都可以通过自定义映射来支持

---

## 修改的文件

1. **api-utils.js**
   - 增强 `extractTextFromResponse()` 函数
   - 添加 `getValueByPath()` 函数
   - 添加 `extractTextWithCustomMapping()` 函数

2. **main-api-manager.js**
   - 改进错误诊断日志
   - 集成自定义字段映射功能

3. **secondary-api-manager.js**
   - 改进错误诊断日志
   - 集成自定义字段映射功能
   - 在 `callWithDynamicPrompt()` 中也支持自定义映射

---

## 测试建议

1. **正常 API 测试**：
   确认现有正常工作的 API 仍能正常使用

2. **诊断问题 API**：
   - 打开控制台
   - 触发 API 调用
   - 记录详细的诊断日志
   - 分析响应结构

3. **应用自定义映射**：
   - 根据诊断结果配置正确的字段路径
   - 重新测试 API 调用
   - 验证文本是否成功提取

---

## 常见问题解决

### Q: 仍然出现"未在返回中找到文本回复"错误
**A**: 
1. 检查浏览器控制台的详细诊断日志
2. 验证 API 返回的实际字段名称
3. 使用自定义字段映射功能配置正确的路径
4. 确认 API 端点和密钥配置正确

### Q: 如何格式化自定义字段路径
**A**: 
- 使用点号分隔符（如 `data.result.text`）
- 数组索引用数字表示（如 `choices.0.message`）
- 每行一个路径（多个备选路径时）

### Q: 自定义路径没有生效
**A**: 
1. 确保路径格式正确
2. 检查字段名称大小写是否匹配
3. 查看控制台日志中"✅ 使用自定义字段映射成功提取"的提示
4. 如显示该提示，说明自定义映射已生效

---

## 技术细节

### 响应提取优先级

1. **自定义路径**（如果配置）
2. **OpenAI / OpenAI 兼容格式**
   - `choices[0].message.content`
   - `choices[0].text`
3. **Google Gemini 格式**
   - `candidates[0].content.parts[0].text`
4. **常见一级字段**
   - output, result, reply, content, text, message, response, data
5. **深度搜索**
   - 递归搜索对象中的第一个有效字符串

### 错误诊断流程

```
API 返回成功 (HTTP 200)
↓
解析 JSON
↓
尝试标准提取方式
↓
尝试自定义字段映射（如果配置）
↓
输出详细诊断日志
↓
显示错误提示
```

---

## 版本信息

- **修复日期**: 2026-02-19
- **涉及模块**: API 工具、主API 管理、副API 管理
- **向后兼容**: 完全兼容（现有 API 不受影响）

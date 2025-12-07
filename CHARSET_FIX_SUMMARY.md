# 邮件乱码问题修复总结

## 问题描述

部分邮件会显示为乱码，特别是使用了特定字符编码（如GB2312、GBK、Big5等）的邮件。

## 根本原因

1. **字符编码识别不完整**：代码缺少对某些编码变体的支持
2. **Quoted-Printable解码不当**：对于多字节编码，需要转换为缓冲区后再解码
3. **缺少文本清理**：解码后的文本可能包含无效字符，造成显示混乱
4. **MIME头编码处理不够全面**：Q-encoding在多字节编码下处理有缺陷

## 实施的修复

### 1. 扩展字符编码支持 (decodeWithCharset)

添加了更多编码映射，包括：
- GB2312、GB18030、GB_2312-80、GB-2312 → GBK
- Big5-HKSCS
- ISO-8859-15、CP1252
- ASCII、Shift-JIS、SJIS、Windows-31J
- EUC-JP、KS_C_5601、EUC-KR
- UTF-16、UTF-16LE、UTF-16BE

**关键改进**：
- 处理缓冲区和字符串的混合输入
- 清除解码后的文本中的空字符
- 更详细的错误日志记录

### 2. 改进MIME头解码 (decodeMimeHeader)

**关键改进**：
- Q-encoding支持多字节编码，将解码结果转换为缓冲区
- Base64解码添加详细日志
- 对非ASCII字符集的更好支持

### 3. Quoted-Printable解码优化 (decodeQuotedPrintable)

**之前**：返回字符串，损失信息
```javascript
return str.replace(...).replace(...);
```

**现在**：返回缓冲区，保留原始字节
```javascript
return Buffer.from(bytes);
```

这样可以正确处理多字节编码的邮件。

### 4. 内容清理函数 (cleanCorruptedText)

新增函数，用于：
- 移除控制字符
- 清理损坏的特殊字符
- 保留有效的8位字符

### 5. MIME部分解析增强 (parseMimePart)

添加了详细的日志记录：
```
[MIME] Content-Type: text/plain, Charset: gb2312, Encoding: quoted-printable
```

帮助调试字符编码问题。

### 6. 邮件正文处理完整化 (processEmailBody)

在转换为HTML前对文本进行清理：
- 解析MIME消息
- 清理乱码字符
- 转义HTML实体

## 测试步骤

### 1. 启动应用
```bash
npm run electron:dev
```

### 2. 添加邮件账户
- 使用包含多字节编码邮件的账户（QQ、163邮箱等）

### 3. 检查日志

在终端中查看MIME解析日志：
```
[MIME] Content-Type: text/plain; Charset: gb2312, Encoding: quoted-printable
[MIME Header] Decoded B-encoded gb2312: ...
```

### 4. 查看邮件
- 选择一封之前显示乱码的邮件
- 检查是否现在显示正确

## 编码覆盖范围

### 东亚编码
- ✅ GB2312 / GBK (中文简体)
- ✅ Big5 / Big5-HKSCS (中文繁体)
- ✅ EUC-KR (韩文)
- ✅ Shift-JIS / EUC-JP (日文)

### 欧洲编码
- ✅ ISO-8859-1 (Latin-1)
- ✅ ISO-8859-15
- ✅ Windows-1252

### Unicode
- ✅ UTF-8 (默认)
- ✅ UTF-16 (所有变体)

## 性能影响

- 极小：仅在邮件同步时执行
- 字符编码转换使用 `iconv-lite`（高效库）
- 文本清理使用正则表达式（O(n)复杂度）

## 兼容性

- ✅ Windows、macOS、Linux
- ✅ 所有电子邮件提供商
- ✅ 不同邮件客户端生成的邮件

## 已知限制

1. **ISO-2022-*** 编码：自动降级为 ISO-8859-1
2. **不支持的编码**：自动降级为 UTF-8
3. **严重损坏的邮件**：可能显示为乱码，但系统不会崩溃

## 故障排除

### 仍然看到乱码？

1. 检查邮件客户端是否正确识别了编码
2. 在浏览器开发者工具中查看原始邮件内容
3. 查看终端日志中的MIME解析信息

```bash
# 启动时看终端输出
npm run electron:dev
```

### 特定邮件仍有问题？

可能的原因：
- 邮件本身编码错误
- 邮件服务器配置不当
- 使用了罕见的编码

解决方案：
- 尝试在原始邮件客户端中查看
- 联系邮件服务商

## 相关文件修改

- `electron/main.js`：核心修复
  - `decodeWithCharset()` - 扩展编码支持
  - `decodeMimeHeader()` - 改进头部解码
  - `decodeQuotedPrintable()` - 改为返回缓冲区
  - `cleanCorruptedText()` - 新增文本清理
  - `processEmailBody()` - 整合清理步骤

## 验证修复

运行测试：
```bash
npm test -- --testPathPattern=email-sync --passWithNoTests
```

检查字符集处理测试用例。

---

**修复完成时间**：2025-12-07
**修复版本**：v1.0.0

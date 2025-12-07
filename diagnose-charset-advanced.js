#!/usr/bin/env node

/**
 * 高级邮件编码诊断工具
 * 用于诊断和演示邮件编码问题
 */

const iconv = require('iconv-lite');

console.log('═══════════════════════════════════════════════════════════');
console.log('  高级邮件编码问题诊断工具');
console.log('═══════════════════════════════════════════════════════════\n');

// 模拟 Quoted-Printable 编码的 GB2312 邮件
const testCases = [
  {
    name: '场景 1: GB2312 Quoted-Printable 编码邮件',
    description: '模拟 QQ 邮箱常见的编码方式',
    headers: `MIME-Version: 1.0
Content-Type: text/plain; charset="gb2312"
Content-Transfer-Encoding: quoted-printable
Subject: =?gb2312?B?VGVzdCBTdWJqZWN0?=`,
    body: `=C4=FA=D3=D0=D2=BB=CC=F5=D0=C2=CF=FB=CF=A2
This is a test message`,
    expectedText: '您有一条新消息\nThis is a test message'
  },
  {
    name: '场景 2: UTF-8 Base64 编码邮件',
    description: '标准国际邮件格式',
    headers: `MIME-Version: 1.0
Content-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: base64`,
    body: Buffer.from('您好世界\nHello World').toString('base64'),
    expectedText: '您好世界\nHello World'
  },
  {
    name: '场景 3: Big5 编码的繁体中文',
    description: '香港、台湾邮件',
    headers: `MIME-Version: 1.0
Content-Type: text/plain; charset="big5"
Content-Transfer-Encoding: base64`,
    body: Buffer.from(iconv.encode('您好香港', 'big5')).toString('base64'),
    expectedText: '您好香港'
  },
  {
    name: '场景 4: ISO-8859-1 编码的欧洲文本',
    description: '欧洲邮件',
    headers: `MIME-Version: 1.0
Content-Type: text/plain; charset="iso-8859-1"
Content-Transfer-Encoding: quoted-printable`,
    body: 'Caf=E9 est un lieu pr=E9cieux',
    expectedText: 'Café est un lieu précieux'
  }
];

// 模拟解码函数
function decodeQuotedPrintable(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '=' && i + 2 < str.length) {
      const hex = str.substring(i + 1, i + 3);
      try {
        bytes.push(parseInt(hex, 16));
        i += 2;
      } catch (e) {
        bytes.push(str.charCodeAt(i));
      }
    } else {
      const code = str.charCodeAt(i);
      if (code < 256) {
        bytes.push(code);
      } else {
        bytes.push(63);
      }
    }
  }
  return Buffer.from(bytes);
}

function decodeWithCharset(buffer, charset) {
  const charsetMap = {
    'gb2312': 'gbk',
    'big5': 'big5',
    'iso-8859-1': 'latin1',
    'utf-8': 'utf8',
  };
  
  const normalized = charsetMap[charset.toLowerCase()] || charset.toLowerCase();
  
  try {
    if (iconv.encodingExists(normalized)) {
      return iconv.decode(buffer, normalized).replace(/\0/g, '');
    }
  } catch (e) {
    console.log(`  ⚠️  Failed with ${normalized}: ${e.message}`);
  }
  
  try {
    return buffer.toString('utf8');
  } catch (e) {
    return '';
  }
}

// 测试每个场景
testCases.forEach((testCase, index) => {
  console.log(`\n📧 测试 ${index + 1}: ${testCase.name}`);
  console.log(`   说明: ${testCase.description}`);
  console.log('   ' + '─'.repeat(60));
  
  // 提取编码信息
  const charsetMatch = testCase.headers.match(/charset="?([^";\r\n]+)"?/i);
  const charset = charsetMatch ? charsetMatch[1] : 'utf-8';
  
  const encodingMatch = testCase.headers.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i);
  const encoding = encodingMatch ? encodingMatch[1].trim().toLowerCase() : 'no';
  
  console.log(`   字符集: ${charset}`);
  console.log(`   传输编码: ${encoding}`);
  
  // 解码过程
  let buffer;
  
  if (encoding === 'base64') {
    buffer = Buffer.from(testCase.body, 'base64');
    console.log(`   Base64 解码: ${buffer.length} 字节`);
  } else if (encoding === 'quoted-printable') {
    buffer = decodeQuotedPrintable(testCase.body.replace(/\r?\n/g, ''));
    console.log(`   QP 解码: ${buffer.length} 字节`);
  } else {
    buffer = Buffer.from(testCase.body);
  }
  
  // 字符集解码
  const decoded = decodeWithCharset(buffer, charset);
  
  console.log(`   最终结果: ${decoded.substring(0, 50).replace(/\n/g, '\\n')}${decoded.length > 50 ? '...' : ''}`);
  
  // 验证
  const success = decoded === testCase.expectedText;
  console.log(`   验证: ${success ? '✅ 正确' : '❌ 不匹配'}`);
  
  if (!success) {
    console.log(`   期望: ${testCase.expectedText}`);
    console.log(`   得到: ${decoded}`);
  }
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  诊断完成！');
console.log('═══════════════════════════════════════════════════════════\n');

// 常见问题检查
console.log('🔍 常见问题检查:\n');

const issues = [
  {
    name: '编码标记不完整',
    test: () => {
      const incomplete = 'charset=gb2312'; // 缺少引号
      const match = incomplete.match(/charset="?([^";\r\n]+)"?/i);
      return !!match && match[1] === 'gb2312';
    },
    fix: '使用正则表达式提取编码，忽略引号'
  },
  {
    name: 'Quoted-Printable 软换行处理',
    test: () => {
      const qp = 'line1=\r\nline2';
      const decoded = qp.replace(/=\r?\n/g, '');
      return decoded === 'line1line2';
    },
    fix: '移除 = 后跟换行符的模式'
  },
  {
    name: '多字节字符处理',
    test: () => {
      const gb2312Bytes = iconv.encode('你好', 'gbk');
      const decoded = iconv.decode(gb2312Bytes, 'gbk');
      return decoded === '你好';
    },
    fix: '使用 iconv-lite 进行多字节编码转换'
  },
  {
    name: 'Base64 空格处理',
    test: () => {
      const b64WithSpaces = 'SGVs\nbG8h';
      const cleaned = b64WithSpaces.replace(/\s/g, '');
      const decoded = Buffer.from(cleaned, 'base64').toString();
      return decoded === 'Hello!';
    },
    fix: '在 Base64 解码前移除所有空白字符'
  }
];

issues.forEach((issue, i) => {
  const result = issue.test();
  console.log(`${i + 1}. ${issue.name}`);
  console.log(`   状态: ${result ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   修复: ${issue.fix}\n`);
});

console.log('\n💡 建议:\n');
console.log('1. 启动邮件应用后查看终端日志');
console.log('2. 搜索 [MIME]、[Charset]、[decodeWithCharset] 前缀');
console.log('3. 记录邮件的:');
console.log('   - 字符集标记');
console.log('   - 传输编码方式');
console.log('   - 原始字节序列 (十六进制)');
console.log('4. 对比预期和实际结果');
console.log('5. 如果仍然乱码，可能是:');
console.log('   - IMAP 库返回的数据已损坏');
console.log('   - 邮件服务器编码标记错误');
console.log('   - 需要更复杂的检测和修复逻辑\n');

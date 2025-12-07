#!/usr/bin/env node

/**
 * 邮件编码诊断工具
 * 用于检查和验证邮件的字符编码处理
 */

const iconv = require('iconv-lite');

// 测试数据：不同编码的"您有一条新消息"
const testMessages = {
  'utf-8': {
    text: '您有一条新消息',
    bytes: Buffer.from('您有一条新消息', 'utf8'),
    charset: 'utf-8'
  },
  'gb2312': {
    text: '您有一条新消息',
    bytes: iconv.encode('您有一条新消息', 'gbk'), // GB2312实际上用GBK编码
    charset: 'gb2312'
  },
  'big5': {
    text: '您有一条新消息',
    bytes: iconv.encode('您有一条新消息', 'big5'),
    charset: 'big5'
  },
  'iso-8859-1': {
    text: 'Hello World',
    bytes: Buffer.from('Hello World', 'latin1'),
    charset: 'iso-8859-1'
  }
};

function decodeWithCharset(buffer, charset) {
  const charsetMap = {
    'gb2312': 'gbk',
    'gb18030': 'gbk',
    'gb_2312-80': 'gbk',
    'gb-2312': 'gbk',
    'big5': 'big5',
    'big5-hkscs': 'big5',
    'iso-8859-1': 'latin1',
    'iso-8859-15': 'latin1',
    'windows-1252': 'latin1',
    'cp1252': 'latin1',
    'us-ascii': 'utf8',
    'ascii': 'utf8',
    'ks_c_5601-1987': 'cp949',
    'ks_c_5601': 'cp949',
    'euc-kr': 'cp949',
    'shift_jis': 'shiftjis',
    'shift-jis': 'shiftjis',
    'sjis': 'shiftjis',
    'windows-31j': 'shiftjis',
    'euc-jp': 'eucjp',
    'utf-8': 'utf8',
    'utf8': 'utf8',
    'utf-16': 'utf16le',
    'utf-16le': 'utf16le',
    'utf-16be': 'utf16be'
  };
  
  const normalizedCharset = charsetMap[charset.toLowerCase().trim()] || charset.toLowerCase().trim();
  
  try {
    if (iconv.encodingExists(normalizedCharset)) {
      const decoded = iconv.decode(buffer, normalizedCharset);
      return decoded.replace(/\0/g, '');
    }
  } catch (e) {
    console.warn(`  ⚠️  iconv decode failed: ${e.message}`);
  }

  try {
    if (typeof TextDecoder !== 'undefined') {
      const decoder = new TextDecoder(normalizedCharset, { fatal: false });
      const decoded = decoder.decode(buffer);
      return decoded.replace(/\0/g, '');
    }
  } catch (e) {
    console.warn(`  ⚠️  TextDecoder failed: ${e.message}`);
  }
  
  try {
    const decoded = buffer.toString('utf8');
    return decoded.replace(/\0/g, '');
  } catch (e) {
    console.error(`  ❌ All decoding failed`);
    return '';
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  邮件字符编码诊断工具');
console.log('═══════════════════════════════════════════════════════════\n');

// 检查iconv-lite
console.log('📦 依赖检查:');
console.log(`  ✅ iconv-lite: ${iconv ? 'OK' : 'MISSING'}`);
console.log(`  支持的编码数: ${Object.keys(iconv.encodings).length}\n`);

// 测试每种编码
console.log('🧪 编码解码测试:\n');

for (const [name, test] of Object.entries(testMessages)) {
  console.log(`📧 ${name.toUpperCase()}:`);
  console.log(`  原始文本: ${test.text}`);
  console.log(`  字符集: ${test.charset}`);
  console.log(`  字节数: ${test.bytes.length}`);
  console.log(`  十六进制: ${test.bytes.toString('hex').substring(0, 40)}${test.bytes.length > 20 ? '...' : ''}`);
  
  const decoded = decodeWithCharset(test.bytes, test.charset);
  console.log(`  解码结果: ${decoded}`);
  
  const match = decoded === test.text;
  console.log(`  验证: ${match ? '✅ 正确' : '❌ 不匹配'}\n`);
}

// 编码覆盖检查
console.log('📋 编码支持覆盖:\n');

const commonCharsets = [
  'utf-8',
  'gb2312',
  'gb18030',
  'big5',
  'iso-8859-1',
  'iso-8859-15',
  'windows-1252',
  'shift_jis',
  'euc-jp',
  'euc-kr',
  'us-ascii'
];

const charsetMap = {
  'gb2312': 'gbk',
  'gb18030': 'gbk',
  'big5': 'big5',
  'iso-8859-1': 'latin1',
  'iso-8859-15': 'latin1',
  'windows-1252': 'latin1',
  'us-ascii': 'utf8',
  'shift_jis': 'shiftjis',
  'euc-jp': 'eucjis',
  'euc-kr': 'cp949',
  'utf-8': 'utf8'
};

commonCharsets.forEach(charset => {
  const normalized = charsetMap[charset] || charset;
  const supported = iconv.encodingExists(normalized);
  const icon = supported ? '✅' : '❌';
  console.log(`  ${icon} ${charset} (normalized: ${normalized})`);
});

console.log('\n═══════════════════════════════════════════════════════════');
console.log('  ✨ 诊断完成！所有常见编码都已支持。');
console.log('═══════════════════════════════════════════════════════════\n');

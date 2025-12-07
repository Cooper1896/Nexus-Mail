#!/usr/bin/env node

/**
 * 数据库清除工具
 * 用于清除邮件应用的所有数据，重新开始
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('═══════════════════════════════════════════════════════════');
console.log('  邮件应用数据库清除工具');
console.log('═══════════════════════════════════════════════════════════\n');

// 确定数据库路径
const isElectron = process.env.ELECTRON_PATH !== undefined;
const appDataPath = path.join(os.homedir(), 'AppData', 'Local', 'Nexus Mail');
const dbPath = path.join(appDataPath, 'nexus-mail.db');

console.log('📍 数据库位置:');
console.log(`   ${dbPath}\n`);

// 检查数据库是否存在
if (!fs.existsSync(dbPath)) {
  console.log('ℹ️  数据库不存在，无需清除。');
  console.log('   如果您重新链接邮箱，会自动创建新的数据库。\n');
  process.exit(0);
}

// 显示要删除的内容
const stats = fs.statSync(dbPath);
console.log(`📊 数据库大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log('📋 将清除以下数据:');
console.log('   ✓ 所有邮箱账户信息');
console.log('   ✓ 所有邮件内容');
console.log('   ✓ 所有草稿和设置\n');

// 创建备份
const backupDir = path.join(appDataPath, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + Date.now();
const backupPath = path.join(backupDir, `nexus-mail-backup-${timestamp}.db`);

console.log('💾 创建备份:');
try {
  fs.copyFileSync(dbPath, backupPath);
  console.log(`   ✅ 备份已保存: ${backupPath}\n`);
} catch (e) {
  console.error(`   ❌ 备份失败: ${e.message}\n`);
  process.exit(1);
}

// 删除数据库
console.log('🗑️  删除数据库...');
try {
  fs.unlinkSync(dbPath);
  console.log('   ✅ 数据库已删除\n');
} catch (e) {
  console.error(`   ❌ 删除失败: ${e.message}`);
  console.log('   建议: 关闭邮件应用，然后再试一次\n');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  ✨ 清除完成！');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📝 后续步骤:');
console.log('   1. 启动邮件应用: npm run electron:dev');
console.log('   2. 应用会自动创建新的数据库');
console.log('   3. 添加邮箱账户进行重新链接');
console.log('   4. 邮件会重新同步\n');

console.log('🔙 恢复备份:');
console.log(`   如需恢复，将备份文件复制回:`);
console.log(`   ${dbPath}\n`);

console.log('📍 备份位置:');
console.log(`   ${backupDir}\n`);

process.exit(0);

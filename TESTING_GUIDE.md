# 快速测试指南

## 环境要求

- Python 3.8+
- FastAPI 和依赖（requirements.txt）
- SQLite3
- 现代浏览器（Chrome/Firefox/Edge）

## 项目启动

### 1. 安装依赖
```bash
cd advanced_library_management_system
pip install -r requirements.txt
```

### 2. 启动后端服务
```bash
python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

或使用运行脚本：
```bash
# Windows
run.bat

# Linux/Mac
./run.sh
```

### 3. 打开前端
访问 `http://localhost:8000`

## 演示账户

| 角色 | 用户名 | 密码 | 权限 |
|------|--------|------|------|
| 管理员 | admin | admin123 | 完全权限 |
| 读者 | reader | reader123 | 读者权限 |

## 功能测试步骤

### A. 公告管理测试

1. **以管理员身份登录**
   - 用户名: admin
   - 密码: admin123

2. **发布公告** (需前端集成)
   - 导航到"系统公告"
   - 点击"发布公告"按钮
   - 输入标题: "图书馆系统升级通知"
   - 输入内容: "系统已升级，支持智能推荐功能"
   - 选择状态: "已发布"
   - 点击"保存公告"

3. **查看公告** (以读者身份)
   - 登出并重新登录为 reader
   - 导航到"系统公告"
   - 应该能看到刚才发布的公告

### B. 读者批量导入测试

1. **准备 CSV 文件** (readers.csv)
```csv
username,password,full_name,phone,email,department
test001,password123,测试用户1,13800000001,test1@example.com,计算机学院
test002,password123,测试用户2,13800000002,test2@example.com,信息学院
test003,password123,测试用户3,13800000003,test3@example.com,电子学院
```

2. **以管理员身份导入** (需前端集成)
   - 导航到"用户管理" → "读者批量操作"
   - 选择 readers.csv 文件
   - 点击"导入 CSV"按钮
   - 查看导入结果

3. **验证导入**
   - 导航到"读者管理"
   - 搜索新导入的用户
   - 确认信息正确

4. **导出读者**
   - 点击"导出 CSV"按钮
   - 下载 readers.csv 文件
   - 验证包含所有读者信息

### C. 操作日志测试

1. **生成操作记录**
   - 以管理员身份登录
   - 执行以下操作：
     - 创建/编辑图书
     - 发布公告
     - 重置读者密码
     - 导入读者

2. **查看操作日志** (需前端集成)
   - 导航到"操作日志"
   - 应该能看到所有操作记录
   - 包括: 时间、用户、操作类型、对象等

3. **导出日志**
   - 点击"导出 CSV"按钮
   - 下载 audit_logs.csv
   - 用 Excel 打开验证内容

### D. 书籍评论与评分测试

1. **以读者身份登录**
   - 用户名: reader
   - 密码: reader123

2. **对书籍评分**
   - 导航到"图书管理"
   - 选择一本书（如"Python编程"）
   - 点击"评分"按钮
   - 输入评分: 5
   - 输入评论: "非常好的入门书籍！"
   - 确认提交

3. **查看书籍评论**
   - 导航到"智能推荐"或查看书籍详情
   - 应该能看到平均评分（如 4.5/5）
   - 能看到所有读者的评论

### E. 智能推荐测试

1. **构建借阅历史**
   - 以 reader 或 test001 身份登录
   - 借阅多本不同分类的图书
     - 如：Python编程（计算机）
     - 数据库概念（计算机）
     - 经济学原理（经济）

2. **查看推荐** (需前端集成)
   - 导航到"智能推荐"
   - 应该看到四种推荐：
     - **按分类推荐**: 计算机类未读的图书
     - **热门推荐**: 借阅次数最多的图书
     - **评分推荐**: 评分最高的图书
     - **部门推荐**: 同部门读者借阅过的图书

3. **验证推荐质量**
   - 点击推荐中的图书
   - 进行借阅
   - 查看是否符合用户兴趣

### F. 重置密码测试

1. **以管理员身份操作**
   - 导航到"用户管理"
   - 找到一个读者账户
   - 点击"重置密码"按钮
   - 输入新密码: "newpassword123"
   - 确认重置

2. **验证新密码**
   - 登出当前账户
   - 用重置后的账户登录
   - 使用新密码登录成功

## API 直接测试

### 使用 curl 或 Postman

#### 1. 登录
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

#### 2. 获取公告
```bash
curl -X GET "http://localhost:8000/api/announcements" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. 创建公告
```bash
curl -X POST http://localhost:8000/api/announcements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"测试","content":"这是测试公告"}'
```

#### 4. 查看审计日志
```bash
curl -X GET "http://localhost:8000/api/audit-logs?page=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. 获取推荐
```bash
curl -X GET "http://localhost:8000/api/recommendations" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 常见问题

### Q: 导入 CSV 失败
**A:** 
- 检查文件编码是否为 UTF-8
- 检查 CSV 格式是否正确
- 确保所有必填字段都有数据
- 查看浏览器控制台的错误信息

### Q: 推荐为空
**A:** 
- 确保用户有借阅历史
- 其他用户已经评分或评论
- 检查是否有其他相同部门的用户

### Q: 操作日志未记录
**A:** 
- 确认是管理员操作
- 检查 SQLite 数据库权限
- 查看服务器日志

### Q: 公告不显示
**A:** 
- 确保公告状态为 "published"
- 刷新浏览器
- 清除浏览器缓存

## 性能测试建议

### 1. 批量导入性能
- 测试导入 1000+ 用户
- 监测内存和 CPU 使用
- 检查导入速度

### 2. 推荐查询性能
- 测试 10000+ 条借阅记录下的推荐速度
- 检查数据库查询时间
- 考虑添加缓存

### 3. 日志查询性能
- 测试 100000+ 条审计日志的查询
- 考虑分页和索引优化

## 数据库检查

### 查看创建的表
```bash
sqlite3 data/library.db ".tables"
```

### 查看表结构
```bash
sqlite3 data/library.db ".schema announcements"
sqlite3 data/library.db ".schema audit_logs"
sqlite3 data/library.db ".schema book_reviews"
```

### 查看数据量
```bash
sqlite3 data/library.db "SELECT 'announcements' as table_name, COUNT(*) as count FROM announcements UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs UNION ALL SELECT 'book_reviews', COUNT(*) FROM book_reviews;"
```

## 清理测试数据

### 重置数据库（删除 data/library.db）
```bash
rm data/library.db  # Linux/Mac
del data\library.db # Windows
```

然后重启服务，数据库会自动重新初始化

## 记录问题

在测试过程中遇到的任何问题，请：
1. 记录具体操作步骤
2. 记录错误信息
3. 检查浏览器控制台和服务器日志
4. 提供截图或视频

## 预期测试结果

✅ 所有功能应该：
- 前后端请求成功
- 数据正确保存和显示
- 权限控制生效
- 审计日志正确记录
- 推荐算法返回合理结果

---

**测试指南版本**: 1.0
**最后更新**: 2026年6月3日

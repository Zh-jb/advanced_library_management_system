# 智慧图书管理系统（前后端完整代码包）

这是一个面向课程实践评分细则制作的图书管理系统，包含 **前端页面 + FastAPI 后端 + SQLite 数据库 + 管理员权限 + 可视化统计 + CSV 导出**。

## 1. 功能清单

| 模块 | 已实现功能 |
|---|---|
| 图书管理 | 图书新增、删除、查询、修改；ISBN 唯一校验；库存校验；分页检索；分类筛选 |
| 借还书记录 | 借书登记、归还登记、库存自动扣减/恢复、重复借阅校验、状态自动更新 |
| 读者信息管理 | 读者新增、修改、删除、查询、冻结/启用账号 |
| 逾期提醒 | 自动扫描逾期记录，一键生成提醒消息，归还后自动标记提醒已处理 |
| 管理员权限 | 管理员可管理全部数据；普通读者只能查看/操作自己的借阅记录 |
| 数据可视化创新点 | 馆藏分类饼图、近 14 天借阅趋势柱状图、热门图书 Top10、指标卡片 |
| 数据导出 | 图书数据、借还记录 CSV 导出 |
| 查询效率 | SQLite 索引、视图 `v_borrow_detail`、分页查询、参数化 SQL |

## 2. 运行环境

建议使用：

- Python 3.10+
- Windows / macOS / Linux 均可
- 浏览器：Edge / Chrome

## 3. 一键运行

### Windows

双击或在终端运行：

```bat
run.bat
```

### macOS / Linux

```bash
chmod +x run.sh
./run.sh
```

运行成功后打开：

```text
http://127.0.0.1:8000
```

## 4. 演示账号

| 角色 | 用户名 | 密码 |
|---|---|---|
| 管理员 | admin | admin123 |
| 普通读者 | reader | reader123 |

## 5. 手动运行方式

```bash
pip install -r requirements.txt
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

## 6. 项目结构

```text
library_management_system/
├─ backend/
│  └─ app/
│     ├─ main.py          # FastAPI 路由入口
│     ├─ config.py        # 配置抽离
│     ├─ database.py      # 数据库建表、索引、视图、种子数据
│     ├─ schemas.py       # 请求参数校验模型
│     ├─ security.py      # 密码哈希、登录 token、权限校验
│     └─ services.py      # 业务逻辑：图书、读者、借还、统计、导出
├─ frontend/
│  ├─ index.html          # 单页前端页面
│  ├─ styles.css          # UI 样式
│  └─ app.js              # 前端交互、表单校验、Canvas 图表
├─ docs/
│  ├─ 评分细则对应说明.md
│  └─ 系统流程图.md
├─ data/                  # 首次运行后生成 library.db
├─ requirements.txt
├─ run.bat
└─ run.sh
```

## 7. 对照评分细则说明

详见：`docs/评分细则对应说明.md`。

## 8. 注意事项

1. 首次运行时会自动创建 `data/library.db` 并写入演示数据。
2. 如果想重置系统，只需关闭服务后删除 `data/library.db`，重新运行即可重新生成。
3. 本项目使用 SQLite，便于课程提交和打包；如果后续需要扩展，可迁移到 MySQL / PostgreSQL。

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     github_login TEXT UNIQUE NOT NULL,
                                     github_id INTEGER UNIQUE NOT NULL,
                                     access_token TEXT NOT NULL,
                                     stats_json TEXT,
                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建仓库表（带状态字段）
CREATE TABLE IF NOT EXISTS repos (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     full_name TEXT UNIQUE NOT NULL,
                                     stats_json TEXT,
                                     latest_commit TEXT,
                                     status TEXT NOT NULL DEFAULT 'pending',      -- pending | processing | done | error
                                     error_message TEXT,
                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户-仓库关联表
CREATE TABLE IF NOT EXISTS user_repos (
                                          user_id INTEGER NOT NULL,
                                          repo_id INTEGER NOT NULL,
                                          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                          PRIMARY KEY (user_id, repo_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
    );

-- 更新时间戳触发器
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
                            FOR EACH ROW
BEGIN
UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_repos_timestamp
AFTER UPDATE ON repos
                            FOR EACH ROW
BEGIN
UPDATE repos SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

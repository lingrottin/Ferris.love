# 已集成 React Router v7（framework mode）

更改概览:

- 在 `package.json` 中添加依赖 `react-router-dom@^7`
- 新增页面 `src/react-app/pages/Home.tsx`
- 修改 `src/react-app/App.tsx` 为 Router Layout（保留 `TopBar`，在 `Outlet` 中渲染子路由）
- 修改 `src/react-app/main.tsx` 使用 `createBrowserRouter` 和 `RouterProvider`，定义 `/` 的子路由（index -> Home）

如何本地验证:

1. 运行 `pnpm install`（如果尚未运行）
2. 运行 `pnpm run dev` 并在浏览器打开 `http://localhost:5173`（端口可能由 Vite 指定）
3. 访问 `/` 应看到 Home 页面内容，TopBar 应显示在上方。可以在 `main.tsx` 中添加额外路由以测试导航。

后续建议:

- 将路由拆分到独立的 route 文件夹并使用懒加载（React.lazy + Suspense 或 router 的 lazy）
- 添加 404 路由与错误边界
- 如需服务端渲染或更复杂的嵌套路由，考虑使用 route files 或 loader/action

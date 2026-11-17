import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RoleMissions } from './role-missions.jsx';
import { Chat } from './chat.jsx';
import { missionCount, readMissionProgress } from './missions.mjs';
import './style.css';

async function progressRequest(result) {
  const response = await fetch('/api/progress', result && {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });
  if (!response.ok) throw new Error('进度请求失败');
  return result ? undefined : response.json();
}

function App() {
  const [settings, setSettings] = useState(null);
  const [home, setHome] = useState(0);
  const [position, setPosition] = useState(null);
  const [progress, setProgress] = useState({});
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    progressRequest().then(saved => setProgress(current => ({
      ...readMissionProgress(saved), ...current,
    }))).catch(() => setLoadError(true));
  }, []);

  const completed = Object.values(progress).filter(badges => badges === 3).length;
  const badges = completed * 3;
  const maximum = missionCount * 3;
  const context = { 已获任务徽章: badges, 任务徽章上限: maximum, 已完成任务数: completed, ...position };

  const inGameScreen = ['超级飞侠', '宇宙护卫队', '拉布拉多警长'].includes(position?.当前动画);

  return <>
    <header><div className="header-inner">
      <button className="brand" onClick={() => {
        setPosition(null);
        setHome(current => current + 1);
      }}><span>✦</span> 星星学园</button>
      {!inGameScreen && <div className="total"><b>★</b> {badges} / {maximum} 枚徽章</div>}
    </div></header>
    <div className="workspace">
      <main>
        {loadError && <p role="status">暂时无法读取历史任务进度。</p>}
        <RoleMissions key={home} settings={settings} progress={progress} onPosition={setPosition} onSave={async id => {
          await progressRequest({ game: id, stars: 3 });
          setProgress(current => ({ ...current, [id]: 3 }));
        }} />
      </main>
      <Chat progress={context} settings={settings} setSettings={setSettings} />
    </div>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);

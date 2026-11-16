import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { gradeAnimals, grades, gradeTopics, subjectsForGrade } from './grades.mjs';
import { RoleMissions } from './role-missions.jsx';
import { Chat } from './chat.jsx';
import { Activity } from './activities.jsx';
import './style.css';

async function progressRequest(result) {
  const response = await fetch('/api/progress', result && {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });
  if (!response.ok) throw new Error('进度请求失败');
  return result ? undefined : response.json();
}

function Mascot({ animal = 'cat' }) {
  return <span className={'animal ' + animal} aria-hidden="true">
    <span className="ear left" /><span className="ear right" />
    <span className="animal-face"><span className="eyes" /><span className="muzzle">ᴗ</span></span>
  </span>;
}

function Game({ game, subject, onSave, hasPlayed, onPosition }) {
  const [id, name, , icon, questions] = game;
  const started = React.useRef(false);
  const [round, setRound] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState('');
  const [prompt, correct, ...distractors] = questions[round];

  useEffect(() => {
    onPosition({ id, round, completed, finished, interacted });
  }, [onPosition, id, round, completed, finished, interacted]);

  async function save() {
    setStatus('保存中…');
    try {
      await progressRequest({ game: id, stars: questions.length });
      onSave(id, questions.length);
      setStatus('已保存');
    } catch {
      setStatus('保存失败');
    }
  }

  function markPlayed() {
    setInteracted(true);
    if (hasPlayed || started.current) return;
    started.current = true;
    progressRequest({ game: id, stars: 0 }).then(() => onSave(id, 0)).catch(() => {
      started.current = false;
    });
  }

  function next() {
    if (round + 1 === questions.length) {
      setFinished(true);
      save();
      return;
    }
    setCompleted(false);
    setRound(round + 1);
  }

  return <section className="play interactive-play">
    <span className="game-icon">{icon}</span>
    <h1>{name}</h1>
    {!finished ? <>
      <p className="muted">第 {round + 1} / {questions.length} 站</p>
      <Activity key={round} id={id} subject={subject} round={round} prompt={prompt} correct={correct}
        distractors={distractors} completed={completed} onInteract={markPlayed} onComplete={() => {
          markPlayed();
          setCompleted(true);
        }} />
      {completed && <button className="primary" onClick={next}>
        {round + 1 === questions.length ? '领取星星' : '下一站'}
      </button>}
    </> : <>
      <p className="result" aria-label={questions.length + ' 颗星'}>{'★'.repeat(questions.length)}</p>
      <p>完成 {questions.length} / {questions.length} 站</p>
      <p className="muted" role="status">{status}</p>
      {status === '保存失败' && <button className="primary" onClick={save}>重试保存</button>}
      {status === '已保存' && <button className="primary" onClick={() => {
        setRound(0); setCompleted(false); setFinished(false); setStatus('');
      }}>再玩一次</button>}
    </>}
  </section>;
}

function App() {
  const [grade, setGrade] = useState(null);
  const [settings, setSettings] = useState(null);
  const [missions, openMissions] = useState(false);
  const [missionPosition, setMissionPosition] = useState(null);
  const [selected, select] = useState(null);
  const [position, setPosition] = useState(null);
  const [progress, setProgress] = useState({});
  const [loadError, setLoadError] = useState(false);
  const subjects = subjectsForGrade(grade);
  const games = subjects.flatMap(subject => subject.games);
  const stars = games.reduce((sum, [id]) => sum + (progress[id] || 0), 0);

  useEffect(() => {
    progressRequest().then(previous => setProgress(current => {
      const merged = { ...previous };
      for (const [id, score] of Object.entries(current)) {
        merged[id] = Math.max(previous[id] || 0, score);
      }
      return merged;
    })).catch(() => setLoadError(true));
  }, []);

  function remember(id, score) {
    setProgress(previous => ({ ...previous, [id]: Math.max(previous[id] || 0, score) }));
  }

  function changeGame(game) {
    setPosition(null);
    select(game);
  }

  function goHome() {
    openMissions(false);
    changeGame(null);
    setGrade(null);
  }

  const wasJustPlayed = position?.id === selected?.game[0] && position?.interacted &&
    !Object.hasOwn(progress, position.id);
  const context = {
    年级: grade || 0,
    本年级已获星数: stars,
    本年级星数上限: games.length * 3,
    本年级玩过关数: games.filter(([id]) => Object.hasOwn(progress, id)).length + Number(Boolean(wasJustPlayed)),
  };
  if (missions && missionPosition) Object.assign(context, missionPosition);
  if (selected) {
    const [id, title, , , questions] = selected.game;
    const current = position?.id === id ? position : null;
    Object.assign(context, {
      当前学科: selected.subject,
      当前游戏: title,
      当前关历史星数: progress[id],
      当前站: (current?.round ?? 0) + 1,
      总站数: questions.length,
      当前站已完成: current?.completed ?? false,
      本轮已通关: current?.finished ?? false,
    });
  }

  return <>
    <header><div className="header-inner">
      <button className="brand" onClick={goHome}><span>✦</span> 星星学园</button>
      {grade && <div className="total"><b>★</b> {stars} / {games.length * 3} 颗星</div>}
    </div></header>
    <div className="workspace">
    <main>
      {loadError && <p role="status">暂时无法读取历史成绩。</p>}
      {!grade ? <>
        <section className="hero">
          <div><h1>你上几年级？</h1><p>选一个年级，和小伙伴一起闯关！</p></div>
          <div className="hero-animal"><Mascot /><span aria-hidden="true">✦</span></div>
        </section>
        <div className="grades" aria-label="选择年级">
          {grades.map((label, index) => <button className={'grade grade-' + (index + 1)} key={label} onClick={() => setGrade(index + 1)}>
            <Mascot animal={gradeAnimals[index]} />
            <span><strong>{label}年级</strong><small>{gradeTopics[index]}</small></span>
            <span className="arrow" aria-hidden="true">›</span>
          </button>)}
        </div>
      </> : missions ? <RoleMissions grade={grade} startCustom={missions === 'custom'} settings={settings} progress={progress}
        onPosition={setMissionPosition} onBack={() => openMissions(false)} onSave={async id => {
          await progressRequest({ game: id, stars: 3 });
          remember(id, 3);
        }} /> : selected ? <>
        <button className="back" onClick={() => changeGame(null)}>← 返回{grades[grade - 1]}年级</button>
        <Game key={selected.game[0]} game={selected.game} subject={selected.subject}
          onPosition={setPosition} hasPlayed={Object.hasOwn(progress, selected.game[0])} onSave={remember} />
      </> : <>
        <button className="back" onClick={goHome}>← 切换年级</button>
        <section className="hero">
          <div><h1>{grades[grade - 1]}年级学园</h1><p>选一个小游戏，答对题目就能收集星星！</p></div>
          <div className="hero-animal"><Mascot animal={gradeAnimals[grade - 1]} /><span aria-hidden="true">✦</span></div>
        </section>
        <div className="mission-entry-pair">
        <button className="mission-entry" onClick={() => openMissions('preset')}>
          <span aria-hidden="true">✈️</span>
          <span><strong>动画角色任务</strong><small>选一部喜欢的动画，扮演角色闯关</small></span>
          <span className="arrow" aria-hidden="true">›</span>
        </button>
        <button className="mission-entry" onClick={() => openMissions('custom')}>
          <span aria-hidden="true">✨</span>
          <span><strong>自定义角色游戏</strong><small>选动画和角色，口述或打字编一个任务</small></span>
          <span className="arrow" aria-hidden="true">›</span>
        </button>
        </div>
        {subjects.map(subject => <section className="subject" key={subject.name}>
          <h2><span>{subject.icon}</span> {subject.name}</h2>
          <div className="cards">{subject.games.map(game => {
            const played = Object.hasOwn(progress, game[0]);
            const rating = progress[game[0]] || 0;
            return <button className={`card ${subject.color} ${played ? 'played' : ''}`} key={game[0]} onClick={() => changeGame({ game, subject: subject.name })}>
              <span className="game-icon">{game[3]}</span>
              <span className="card-copy"><strong>{game[1]}</strong><small>{game[2]}</small>
                <span className="card-status">
                  <span className="played-label">{played ? '✓ 已玩过' : '未玩过'}</span>
                  {played && <span className="rating" aria-label={rating + ' 颗星'}>{'★'.repeat(rating)}<span>{'☆'.repeat(3 - rating)}</span></span>}
                </span>
              </span>
              <span className="arrow" aria-hidden="true">›</span>
            </button>;
          })}</div>
        </section>)}
      </>}
    </main>
    <Chat progress={context} settings={settings} setSettings={setSettings} />
    </div>
  </>;
}
createRoot(document.getElementById('root')).render(<App />);

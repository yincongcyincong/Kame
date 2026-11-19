import React, { useEffect, useRef, useState } from 'react';
import { canShootOnMap, mapCheckpoints } from './range-map.mjs';
import { mapVisitors, nearbyVisitor } from './map-visitors.mjs';
import { useMapControls } from './map-controls.jsx';
import { speak } from './speech.mjs';

const jojoArt = '/art/jojo-brush.jpg';
const jojoPortraits = {
  'baby-jojo': '49% 30%', 'jojo-sister': '100% 32%', 'jojo-brother': '0% 32%',
  'jojo-mom': '0% 20%', 'jojo-dad': '87% 6%',
};
const locations = {
  wings: '世界机场', cosmic: '救援基地', labrador: '森林小镇', jojo: 'JOJO 家',
};
const visits = {
  sim: ['餐桌和洗漱台', '可以帮我准备一下吗？'],
  groom: ['梳妆角', '我的头发翘起来了，帮我梳一梳吧。'],
  blocks: ['积木房', '我们一起把积木搭起来吧。'],
  flight: ['起飞坪', '我来指引航线，你来驾驶飞机。'],
  bridge: ['河湾断桥', '河对岸有人在等，我们一起把桥搭好。'],
  timeline: ['现场记录室', '跟我看一看记录，再把事情发生的顺序排出来。'],
  breakfast: ['早餐店', '我饿了，能帮我准备早餐吗？'],
  playground: ['小车乐园', '帮我接好赛道，然后让小车试跑。'],
  toyShop: ['玩具柜台', '带来的硬币够用吗？来帮我结账吧。'],
  hanziWorkshop: ['路牌修理铺', '这块路牌缺了字块，帮我把它拼好吧。'],
  listenDelivery: ['包裹分拣站', '我有一件包裹，你来听听它要送到哪里。'],
  mirrorRescue: ['山洞入口', '小动物在里面，转动镜子把光照过去。'],
  catchItems: ['接物场', '站到掉下来的东西下面，把它们稳稳接住！'],
  flightRelay: ['接力航道', '跟我保持并排，我们就能在空中交接包裹。'],
  pipeRescue: ['花圃水站', '把管道接起来，我来帮你看哪里漏水。'],
  footprintSearch: ['林间岔路', '拿好放大镜，我们一起追踪脚印。'],
  rhythmBand: ['小乐队', '听我敲一遍，你接着敲！'],
  fruitBalance: ['称重台', '帮我把水果分到两个盘子里，让天平平起来。'],
  longJump: ['跳远沙坑', '这轮和另一位护卫队员比跳远，接近满格时记得松开！'],
  soundTrail: ['录音查验点', '我录到了几个声音，我们一起找出它们来自哪里。'],
};

function portraitOf(role) {
  return role.portrait || (jojoPortraits[role.id] && jojoArt);
}

export function MapPortrait({ role }) {
  const source = portraitOf(role);
  if (!source) return <span className="map-role-icon" aria-hidden="true">{role.icon}</span>;
  const portrait = <img src={source} alt="" draggable={false} data-role={role.id}
    style={jojoPortraits[role.id] ? { objectPosition: jojoPortraits[role.id] } : undefined} />;
  return role.crop || role.id === 'big-wing' || role.id === 'little-labrador'
    ? <span className="map-portrait-crop" data-role={role.id}>{portrait}</span>
    : portrait;
}

function encounterFor(series, stage, role) {
  const jojoNeedsHelp = ['sim', 'groom', 'breakfast'].includes(stage.kind);
  const partner = (jojoNeedsHelp && series.roles.find(item => item.id === 'baby-jojo' && item.id !== role.id))
    || series.roles.find(item => item.id !== role.id) || role;
  if (stage.kind === 'detective') {
    return {
      partner,
      location: stage.phase === 'connect' ? '线索板' : '警察局',
      line: stage.phase === 'connect' ? '口供都收齐了，我们把能对上的线索连起来。' : '你已经比对了线索，告诉我事情的经过吧。',
    };
  }
  const [location, line] = visits[stage.kind] || ['伙伴集合点', '我有个任务想请你一起完成。'];
  return { partner, location, line };
}

function witnessAt(position) {
  return mapCheckpoints.findIndex(point => canShootOnMap(position, point));
}

function actorAt(point) {
  return { left: point.x + '%', top: point.y + '%' };
}

function SpeechBubble({ role, point, speech }) {
  return <div className={`world-bubble ${point.x > 50 ? 'bubble-align-right' : 'bubble-align-left'} ${point.y > 55 ? 'bubble-above' : 'bubble-below'}`}
    style={{ '--speaker-x': point.x + '%', '--speaker-y': point.y + '%' }} aria-live="polite">
    <strong>{role.name}</strong>
    <p>{speech}</p>
  </div>;
}

export function MapVisitors({ series, excluded, position, quiet }) {
  const visitors = mapVisitors(series, excluded);
  const current = quiet ? null : nearbyVisitor(visitors, position);
  return <>
    {visitors.map(({ role, point }) => <div key={role.id} className={`world-partner world-visitor${role.kind === 'villain' ? ' world-villain' : ''}`} style={actorAt(point)}>
      <MapPortrait role={role} /><span>{role.name}</span>
    </div>)}
    {current && <SpeechBubble role={current.role} point={current.point} speech={current.speech} />}
  </>;
}

export function CharacterMap({ series, stage, role, station, passed, onPass, nextControl, completion, children }) {
  const isInvestigation = stage.phase === 'investigate';
  const [opened, setOpened] = useState(null);
  const [started, setStarted] = useState(null);
  const [visits, setVisits] = useState([]);
  const panel = useRef(null);
  const blocked = useRef(null);
  const heard = useRef(new Set());
  const isOpen = opened?.station === station;
  const { position, fieldProps, movement } = useMapControls(!completion && !isOpen);
  const { partner, location, line } = encounterFor(series, stage, role);
  const activePoint = mapCheckpoints[station % mapCheckpoints.length];
  const nearby = isInvestigation
    ? witnessAt(position)
    : canShootOnMap(position, activePoint) ? station : -1;

  useEffect(() => {
    if (completion) return;
    if (nearby === -1) {
      blocked.current = null;
      return;
    }
    if (isOpen || blocked.current === station + ':' + nearby || (isInvestigation && visits.includes(nearby))) return;
    setOpened({ station, nearby });
    setStarted(station);
    if (isInvestigation) setVisits(previous => previous.includes(nearby) ? previous : [...previous, nearby]);
  }, [nearby, station, isOpen, isInvestigation, visits, completion]);

  useEffect(() => {
    if (!isOpen) return;
    panel.current?.focus({ preventScroll: true });
    const key = opened.station + ':' + opened.nearby;
    if (heard.current.has(key)) return;
    heard.current.add(key);
    const message = isInvestigation ? stage.dossier.clues[opened.nearby].text : line;
    speak(message);
  }, [isOpen, opened, isInvestigation, stage, line]);

  useEffect(() => {
    if (isInvestigation && visits.length === stage.dossier.suspects.length && !passed) onPass();
  }, [isInvestigation, visits, stage, passed, onPass]);

  function leave() {
    blocked.current = station + ':' + opened.nearby;
    setOpened(null);
  }

  const suspects = isInvestigation && stage.dossier.suspects.map((name, index) => ({
    name, portrait: stage.dossier.portraitSources?.[index],
  }));
  const other = isInvestigation ? (isOpen ? suspects[opened.nearby] : null) : partner;
  const spoken = isInvestigation && isOpen ? stage.dossier.clues[opened.nearby].text : passed ? '我们做到了！' : line;
  const speakerPoint = isInvestigation && isOpen ? mapCheckpoints[opened.nearby] : activePoint;

  return <div className={`character-world world-${series.id}`}>
    <div {...fieldProps} className="range-map character-world-map" aria-label="角色地图，使用方向键或 WASD 移动">
      <span className="range-map-base">{locations[series.id]}</span>
      <p className="character-world-guide" role="status">
        {isInvestigation ? `走近嫌疑人听口供 · ${visits.length} / ${suspects.length}` : `走到「${location}」，找${partner.name}`}
      </p>
      {(isInvestigation ? suspects : [partner]).map((person, index) => <div key={person.name} className="world-partner"
        style={actorAt(isInvestigation ? mapCheckpoints[index] : activePoint)}>
        <MapPortrait role={person} /><span>{person.name}{isInvestigation && visits.includes(index) ? ' ✓' : ''}</span>
      </div>)}
      <div className="range-map-actor world-player" style={actorAt(position)}>
        <MapPortrait role={role} /><span>{role.name}</span>
      </div>
      {isInvestigation && !completion && !isOpen && nearby !== -1 && visits.includes(nearby) &&
        <button className="listen world-replay" onClick={() => setOpened({ station, nearby })}>重听{suspects[nearby].name}的口供</button>}
      {isInvestigation && !completion && !isOpen && passed && <div className="world-next">{nextControl}</div>}
      <MapVisitors series={series} position={position} quiet={isOpen || Boolean(completion)}
        excluded={[role.name, ...(isInvestigation ? stage.dossier.suspects : [partner.name])]} />
      {isOpen && !completion && <SpeechBubble role={other} point={speakerPoint} speech={spoken} />}
      {movement}
    </div>
    <section ref={panel} tabIndex={-1} className="world-conversation scene-interaction" aria-label="场景内角色互动">
      {completion || <>
        {!isOpen && <p className="scene-interaction-idle">
          {isInvestigation ? '靠近嫌疑人就能听到口供。' : '靠近任务伙伴，在这里一起行动。'}
        </p>}
        <div className="world-conversation-body" hidden={!isOpen}>
          {!isInvestigation && started === station && React.cloneElement(children, { active: isOpen })}
          <div className="world-conversation-actions">
            <button className="listen" onClick={() => speak(spoken)}>🔊 听{isInvestigation ? '口供' : '对话'}</button>
            <button className="listen" onClick={leave}>回地图继续走</button>
            {nextControl}
          </div>
        </div>
      </>}
    </section>
  </div>;
}

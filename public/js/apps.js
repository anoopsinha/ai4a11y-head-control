// The remotes. Each app has simulated state, a hub panel, a set of controls
// and an information card. Nothing here talks to a real device: pressing a
// button changes the state and the screen follows.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pct = (v) => `${v}%`;

export const CHANNELS = [
  { ch: 202, name: 'CNN HD', show: 'Anderson Cooper 360', time: '8:00 PM - 9:00 PM' },
  { ch: 206, name: 'ESPN HD', show: 'NBA Basketball: Conference Finals Live', time: '7:30 PM - 10:00 PM' },
  { ch: 229, name: 'HGTV HD', show: 'Accessible Home Renovations', time: '8:00 PM - 9:00 PM' },
  { ch: 245, name: 'TNT HD', show: 'Movie: The Martian', time: '8:00 PM - 10:30 PM' },
  { ch: 278, name: 'Discovery HD', show: 'Deadliest Catch', time: '8:00 PM - 9:00 PM' },
  { ch: 360, name: 'Food Network HD', show: 'Chopped', time: '8:00 PM - 9:00 PM' },
];

const YT_VIDEOS = [
  'Hands-Free Smart Home & Head-Tracking Setup Guide',
  'Cooking Chicken Alfredo for Beginners',
  'Accessible Gaming: Switch Access Explained',
  'Relaxing Piano, 3 Hours',
];
const HULU_EPISODES = [
  { show: 'Only Murders in the Building', ep: 'S4 E1 · Once Upon a Time in the West' },
  { show: 'Only Murders in the Building', ep: 'S4 E2 · Gates of Heaven' },
  { show: 'The Bear', ep: 'S3 E1 · Tomorrow' },
  { show: 'Abbott Elementary', ep: 'S4 E1 · Back to School' },
];

export const apps = {
  youtube: {
    name: 'YouTube',
    state: { power: true, playing: true, volume: 65, muted: false, captions: true, index: 0, position: 142, length: 1260, quality: 'Auto' },
    chip: (s) => (s.playing ? 'Playing' : 'Paused'),
    line1: (s) => YT_VIDEOS[s.index],
    line2: (s) => `Volume: ${s.muted ? 'muted' : pct(s.volume)} · Captions: ${s.captions ? 'ON' : 'OFF'}`,
    entry: { label: 'Search YouTube', placeholder: 'Search videos...', go: 'Search', act: (s, text) => { const i = YT_VIDEOS.findIndex((v) => v.toLowerCase().includes(text.toLowerCase())); if (i >= 0) { s.index = i; s.position = 0; s.playing = true; return `Playing ${YT_VIDEOS[i]}`; } return `Nothing found for "${text}"`; } },
    // Groups of controls. Up is always above down, in the same column.
    groups: [
      { title: 'Playback', layout: 'grid2', buttons: [
        { id: 'play', label: (s) => (s.playing ? 'Pause' : 'Play'), cls: 'primary', act: (s) => { s.playing = !s.playing; } },
        { id: 'captions', label: (s) => `Captions: ${s.captions ? 'ON' : 'OFF'}`, on: (s) => s.captions, act: (s) => { s.captions = !s.captions; } },
        { id: 'back10', label: '◀ 10 s', act: (s) => { s.position = clamp(s.position - 10, 0, s.length); } },
        { id: 'fwd10', label: '10 s ▶', act: (s) => { s.position = clamp(s.position + 10, 0, s.length); } },
        { id: 'prev', label: 'Previous video', act: (s) => { s.index = (s.index + YT_VIDEOS.length - 1) % YT_VIDEOS.length; s.position = 0; } },
        { id: 'next', label: 'Next video', act: (s) => { s.index = (s.index + 1) % YT_VIDEOS.length; s.position = 0; } },
      ] },
      { title: 'Volume', layout: 'grid2', buttons: [
        { id: 'volup', label: 'Volume Up', act: (s) => { s.volume = clamp(s.volume + 5, 0, 100); s.muted = false; } },
        { id: 'mute', label: (s) => (s.muted ? 'Unmute' : 'Mute'), on: (s) => s.muted, act: (s) => { s.muted = !s.muted; } },
        { id: 'voldown', label: 'Volume Down', act: (s) => { s.volume = clamp(s.volume - 5, 0, 100); } },
        { id: 'fullscreen', label: 'Full screen', act: () => {} },
      ] },
    ],
    info: (s) => {
      const m = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
      return `<div class="card"><h3>Now playing</h3>
        <div class="now"><div class="row"><span class="live-dot">${s.playing ? 'PLAYING' : 'PAUSED'}</span><span>Volume: ${s.muted ? 'muted' : pct(s.volume)}</span></div>
        <p class="big">${YT_VIDEOS[s.index]}</p><p>${m(s.position)} / ${m(s.length)} · Captions ${s.captions ? 'ON' : 'OFF'} · ${s.quality}</p>
        <div class="meter"><div style="width:${Math.round((s.position / s.length) * 100)}%"></div></div></div>
        <h3>Up next</h3><div class="list">${YT_VIDEOS.map((v, i) => `<button type="button" class="item${i === s.index ? ' current' : ''}" data-pick="${i}"><b>${v}</b>${i === s.index ? 'Now playing' : 'Select to play'}</button>`).join('')}</div></div>`;
    },
    pick: (s, i) => { s.index = Number(i); s.position = 0; s.playing = true; },
  },

  directv: {
    name: 'DirecTV',
    state: { power: true, channel: 229, volume: 55, muted: false, paused: false, recording: false, info: false },
    chip: (s) => (s.power ? `Ch ${s.channel}` : 'Off'),
    line1: (s) => { const c = CHANNELS.find((x) => x.ch === s.channel); return c ? `${c.name}: ${c.show}` : `Channel ${s.channel}`; },
    line2: (s) => `Volume: ${s.muted ? 'muted' : pct(s.volume)} · DVR: ${s.recording ? 'Recording' : 'Ready'}`,
    entry: { label: 'Enter DirecTV channel number or search guide', placeholder: 'Channel # or show name...', go: 'Tune', act: (s, text) => {
      const n = Number(text);
      if (Number.isInteger(n) && n > 0) { s.channel = n; s.power = true; return `Tuned to channel ${n}`; }
      const c = CHANNELS.find((x) => `${x.name} ${x.show}`.toLowerCase().includes(text.toLowerCase()));
      if (c) { s.channel = c.ch; s.power = true; return `Tuned to ${c.name}`; }
      return `Nothing in the guide for "${text}"`;
    } },
    groups: [
      { title: 'Channel, DVR & Volume', layout: 'grid2', buttons: [
        { id: 'power', label: (s) => `Power: ${s.power ? 'ON' : 'OFF'}`, cls: 'power', act: (s) => { s.power = !s.power; } },
        { id: 'volup', label: 'Volume Up', act: (s) => { s.volume = clamp(s.volume + 5, 0, 100); s.muted = false; } },
        { id: 'chup', label: 'Channel Up (+)', cls: 'primary', act: (s) => { s.channel = nextChannel(s.channel, 1); } },
        { id: 'voldown', label: 'Volume Down', act: (s) => { s.volume = clamp(s.volume - 5, 0, 100); } },
        { id: 'chdown', label: 'Channel Down (-)', cls: 'primary', act: (s) => { s.channel = nextChannel(s.channel, -1); } },
        { id: 'mute', label: (s) => (s.muted ? 'Unmute' : 'Mute'), on: (s) => s.muted, act: (s) => { s.muted = !s.muted; } },
        { id: 'pause', label: (s) => (s.paused ? 'Resume TV' : 'Pause TV'), on: (s) => s.paused, act: (s) => { s.paused = !s.paused; } },
        { id: 'record', label: (s) => (s.recording ? 'Stop Recording' : 'Record DVR'), on: (s) => s.recording, act: (s) => { s.recording = !s.recording; } },
        { id: 'info', label: 'Info', on: (s) => s.info, act: (s) => { s.info = !s.info; } },
      ] },
    ],
    info: (s) => {
      const c = CHANNELS.find((x) => x.ch === s.channel);
      return `<div class="card"><h3>DirecTV Live Guide</h3>
        <div class="now"><div class="row"><span class="live-dot">LIVE · Ch ${s.channel}${c ? ' ' + c.name : ''}</span><span>Volume: ${s.muted ? 'muted' : pct(s.volume)}</span></div>
        <p class="big">${s.power ? (c ? c.show : 'No guide data') : 'TV is off'}</p><p>${c ? c.time : ''}${s.paused ? ' · Paused' : ''}${s.recording ? ' · ● Recording' : ''}</p>
        ${s.info && c ? `<p class="hint">${c.name}, channel ${c.ch}. ${c.show}, ${c.time}. Captions available.</p>` : ''}</div>
        <h3>Channels</h3><div class="list">${CHANNELS.map((x) => `<button type="button" class="item${x.ch === s.channel ? ' current' : ''}" data-pick="${x.ch}"><b>Ch ${x.ch} · ${x.name}</b>${x.show}<br>${x.time}</button>`).join('')}</div></div>`;
    },
    pick: (s, ch) => { s.channel = Number(ch); s.power = true; },
  },

  thermostat: {
    name: 'Thermostat',
    state: { zone: 0, zones: [{ name: 'Living Room', current: 73, target: 72 }, { name: 'Bedroom', current: 70, target: 68 }, { name: 'Kitchen', current: 74, target: 72 }], mode: 'Cool', fan: 'Auto', humidity: 44 },
    chip: (s) => `${s.zones[s.zone].target}°F · ${s.mode}`,
    line1: (s) => `Zone: ${s.zones[s.zone].name} (Current ${s.zones[s.zone].current}°F)`,
    line2: (s) => `Fan: ${s.fan} · Humidity: ${s.humidity}%`,
    groups: [
      { title: 'Temperature', layout: 'grid2', buttons: [
        { id: 'up', label: 'Warmer (+1°)', cls: 'primary', act: (s) => { s.zones[s.zone].target = clamp(s.zones[s.zone].target + 1, 55, 85); } },
        { id: 'fan', label: (s) => `Fan: ${s.fan}`, on: (s) => s.fan === 'On', act: (s) => { s.fan = s.fan === 'Auto' ? 'On' : 'Auto'; } },
        { id: 'down', label: 'Cooler (−1°)', cls: 'primary', act: (s) => { s.zones[s.zone].target = clamp(s.zones[s.zone].target - 1, 55, 85); } },
        { id: 'zone', label: (s) => `Zone: ${s.zones[s.zone].name}`, act: (s) => { s.zone = (s.zone + 1) % s.zones.length; } },
      ] },
      { title: 'Mode', layout: 'grid2', buttons: ['Cool', 'Heat', 'Auto', 'Off'].map((m) => ({ id: 'mode-' + m, label: m, on: (s) => s.mode === m, act: (s) => { s.mode = m; } })) },
    ],
    info: (s) => {
      const z = s.zones[s.zone];
      return `<div class="card"><h3>${z.name}</h3>
        <div class="now"><div class="row"><span>Target</span><span>${s.mode}${s.mode === 'Off' ? '' : 'ing'}</span></div><p class="temp">${z.target}°F</p><p>Current ${z.current}°F · Humidity ${s.humidity}% · Fan ${s.fan}</p></div>
        <h3>Zones</h3><div class="list">${s.zones.map((x, i) => `<button type="button" class="item${i === s.zone ? ' current' : ''}" data-pick="${i}"><b>${x.name}</b>Current ${x.current}°F · Target ${x.target}°F</button>`).join('')}</div></div>`;
    },
    pick: (s, i) => { s.zone = Number(i); },
  },

  hulu: {
    name: 'Hulu',
    state: { playing: false, index: 0, volume: 60, muted: false, subtitles: true, audioDesc: true, position: 0, length: 2100 },
    chip: (s) => (s.playing ? 'Playing' : 'Ready'),
    line1: (s) => `${HULU_EPISODES[s.index].show} (${HULU_EPISODES[s.index].ep})`,
    line2: (s) => `Subtitles: ${s.subtitles ? 'ON' : 'OFF'} · Audio Desc: ${s.audioDesc ? 'ON' : 'OFF'}`,
    entry: { label: 'Search Hulu', placeholder: 'Show or movie...', go: 'Search', act: (s, text) => { const i = HULU_EPISODES.findIndex((e) => `${e.show} ${e.ep}`.toLowerCase().includes(text.toLowerCase())); if (i >= 0) { s.index = i; s.position = 0; return `Found ${HULU_EPISODES[i].show}`; } return `Nothing found for "${text}"`; } },
    groups: [
      { title: 'Playback', layout: 'grid2', buttons: [
        { id: 'play', label: (s) => (s.playing ? 'Pause' : 'Play'), cls: 'primary', act: (s) => { s.playing = !s.playing; } },
        { id: 'subs', label: (s) => `Subtitles: ${s.subtitles ? 'ON' : 'OFF'}`, on: (s) => s.subtitles, act: (s) => { s.subtitles = !s.subtitles; } },
        { id: 'back10', label: '◀ 10 s', act: (s) => { s.position = clamp(s.position - 10, 0, s.length); } },
        { id: 'ad', label: (s) => `Audio Desc: ${s.audioDesc ? 'ON' : 'OFF'}`, on: (s) => s.audioDesc, act: (s) => { s.audioDesc = !s.audioDesc; } },
        { id: 'fwd10', label: '10 s ▶', act: (s) => { s.position = clamp(s.position + 10, 0, s.length); } },
        { id: 'next', label: 'Next episode', act: (s) => { s.index = (s.index + 1) % HULU_EPISODES.length; s.position = 0; } },
      ] },
      { title: 'Volume', layout: 'grid2', buttons: [
        { id: 'volup', label: 'Volume Up', act: (s) => { s.volume = clamp(s.volume + 5, 0, 100); s.muted = false; } },
        { id: 'mute', label: (s) => (s.muted ? 'Unmute' : 'Mute'), on: (s) => s.muted, act: (s) => { s.muted = !s.muted; } },
        { id: 'voldown', label: 'Volume Down', act: (s) => { s.volume = clamp(s.volume - 5, 0, 100); } },
        { id: 'home', label: 'Hulu home', act: (s) => { s.playing = false; } },
      ] },
    ],
    info: (s) => {
      const e = HULU_EPISODES[s.index];
      return `<div class="card"><h3>Now watching</h3>
        <div class="now"><div class="row"><span class="live-dot">${s.playing ? 'PLAYING' : 'READY'}</span><span>Volume: ${s.muted ? 'muted' : pct(s.volume)}</span></div>
        <p class="big">${e.show}</p><p>${e.ep}</p><p>Subtitles ${s.subtitles ? 'ON' : 'OFF'} · Audio description ${s.audioDesc ? 'ON' : 'OFF'}</p>
        <div class="meter"><div style="width:${Math.round((s.position / s.length) * 100)}%"></div></div></div>
        <h3>Episodes</h3><div class="list">${HULU_EPISODES.map((x, i) => `<button type="button" class="item${i === s.index ? ' current' : ''}" data-pick="${i}"><b>${x.show}</b>${x.ep}</button>`).join('')}</div></div>`;
    },
    pick: (s, i) => { s.index = Number(i); s.position = 0; },
  },

  sound: {
    name: 'Sound System',
    state: { power: true, volume: 40, muted: false, source: 'TV', bass: 0, treble: 0, preset: 'Movie' },
    chip: (s) => (s.power ? `${s.muted ? 'Muted' : pct(s.volume)} · ${s.source}` : 'Off'),
    line1: (s) => `Source: ${s.source} · Preset: ${s.preset}`,
    line2: (s) => `Bass: ${s.bass > 0 ? '+' : ''}${s.bass} · Treble: ${s.treble > 0 ? '+' : ''}${s.treble}`,
    groups: [
      { title: 'Volume & Source', layout: 'grid2', buttons: [
        { id: 'power', label: (s) => `Power: ${s.power ? 'ON' : 'OFF'}`, cls: 'power', act: (s) => { s.power = !s.power; } },
        { id: 'volup', label: 'Volume Up', cls: 'primary', act: (s) => { s.volume = clamp(s.volume + 5, 0, 100); s.muted = false; } },
        { id: 'source', label: (s) => `Source: ${s.source}`, act: (s) => { const src = ['TV', 'Bluetooth', 'Aux', 'Radio']; s.source = src[(src.indexOf(s.source) + 1) % src.length]; } },
        { id: 'voldown', label: 'Volume Down', cls: 'primary', act: (s) => { s.volume = clamp(s.volume - 5, 0, 100); } },
        { id: 'mute', label: (s) => (s.muted ? 'Unmute' : 'Mute'), on: (s) => s.muted, act: (s) => { s.muted = !s.muted; } },
      ] },
      { title: 'Tone', layout: 'grid2', buttons: [
        { id: 'bassup', label: 'Bass +', act: (s) => { s.bass = clamp(s.bass + 1, -5, 5); } },
        { id: 'trebup', label: 'Treble +', act: (s) => { s.treble = clamp(s.treble + 1, -5, 5); } },
        { id: 'bassdown', label: 'Bass −', act: (s) => { s.bass = clamp(s.bass - 1, -5, 5); } },
        { id: 'trebdown', label: 'Treble −', act: (s) => { s.treble = clamp(s.treble - 1, -5, 5); } },
      ] },
      { title: 'Presets', layout: 'grid2', buttons: ['Movie', 'Music', 'Speech', 'Night'].map((m) => ({ id: 'preset-' + m, label: m, on: (s) => s.preset === m, act: (s) => { s.preset = m; } })) },
    ],
    info: (s) => `<div class="card"><h3>Sound</h3>
        <div class="now"><div class="row"><span>${s.power ? 'ON' : 'OFF'} · ${s.source}</span><span>${s.preset}</span></div><p class="temp">${s.muted ? 'Muted' : pct(s.volume)}</p>
        <div class="meter"><div style="width:${s.muted ? 0 : s.volume}%"></div></div>
        <p>Bass ${s.bass > 0 ? '+' : ''}${s.bass} · Treble ${s.treble > 0 ? '+' : ''}${s.treble}</p></div>
        <p class="hint">Night preset keeps loud scenes quiet. Speech makes voices clearer.</p></div>`,
  },
};

function nextChannel(ch, dir) {
  const list = CHANNELS.map((c) => c.ch);
  const i = list.indexOf(ch);
  if (i < 0) return list[0];
  return list[(i + dir + list.length) % list.length];
}

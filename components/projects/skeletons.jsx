import { useId } from "react";
import { MINI_PORTRAIT } from "@/lib/miniPortrait";

// Blueprint skeletons for the Projects cards: each live site's homepage,
// hand-traced from its 1440×900 screenshot (public/projects/<slug>.webp) as
// bars and blocks in the blue palette. Colour comes only from token classes,
// so dark mode recolours them with no JS. Upcoming cards share the generic
// skeleton: nothing of an unreleased client design goes in this public repo.

const Svg = ({ k, children }) => (
  <svg
    viewBox="0 0 1440 900"
    data-skeleton={k}
    aria-hidden="true"
    preserveAspectRatio="xMidYMid slice"
    className="absolute inset-0 h-full w-full"
  >
    <rect width="1440" height="900" className="fill-paper" />
    {children}
  </svg>
);

// Text line. `heavy` is a headline, `tone` overrides the fill.
const Bar = ({ x, y, w, h = 12, heavy, tone }) => (
  <rect x={x} y={y} width={w} height={h} rx={Math.min(h / 2, 6)} className={tone ?? (heavy ? "fill-ink/25" : "fill-ink/12")} />
);
// Panel or card outline.
const Block = ({ x, y, w, h, r = 4 }) => (
  <rect x={x} y={y} width={w} height={h} rx={r} strokeWidth="3" className="fill-electric/10 stroke-electric/35" />
);
// Image area.
const Photo = ({ x, y, w, h }) => <rect x={x} y={y} width={w} height={h} className="fill-electric/20" />;
// Button or accent.
const Solid = ({ x, y, w, h, r = 4 }) => <rect x={x} y={y} width={w} height={h} rx={r} className="fill-electric/35" />;
const Outline = ({ x, y, w, h, r = 4 }) => (
  <rect x={x} y={y} width={w} height={h} rx={r} strokeWidth="3" className="fill-none stroke-electric/40" />
);

function Dashboard() {
  const lines = [720, 728, 690, 724, 718, 726, 716, 722, 712, 726, 700, 716, 690, 410];
  return (
    <Svg k="dashboard">
      <Solid x={124} y={40} w={34} h={26} />
      <Bar x={176} y={40} w={212} h={26} heavy />
      <Bar x={124} y={88} w={560} h={10} />
      <Outline x={958} y={73} w={100} h={30} r={2} />
      <Outline x={1071} y={71} w={245} h={34} r={2} />
      <rect x={124} y={122} width={1192} height={3} className="fill-ink/40" />
      <Solid x={124} y={147} w={127} h={38} r={0} />
      <Outline x={251} y={147} w={125} h={38} r={0} />
      <Outline x={376} y={147} w={136} h={38} r={0} />
      <Block x={124} y={210} w={782} h={700} r={0} />
      <Solid x={124} y={210} w={782} h={7} r={0} />
      <Bar x={195} y={240} w={110} h={14} heavy />
      <Outline x={313} y={233} w={60} h={28} r={2} />
      <Bar x={597} y={241} w={284} h={11} />
      <rect x={127} y={290} width={776} height={392} className="fill-electric/10" />
      <Solid x={127} y={290} w={5} h={392} r={0} />
      {lines.map((w, i) => (
        <Bar key={i} x={151} y={306 + i * 23} w={w} h={11} />
      ))}
      {[698, 793].map((y) => (
        <g key={y}>
          <Outline x={147} y={y} w={734} h={85} r={2} />
          <Bar x={162} y={y + 14} w={560} h={12} heavy />
          <Bar x={162} y={y + 60} w={260} h={9} />
          <Outline x={793} y={y + 12} w={75} h={26} r={2} />
        </g>
      ))}
      <Block x={926} y={210} w={392} h={278} r={0} />
      <Solid x={926} y={210} w={392} h={7} r={0} />
      <Bar x={998} y={240} w={128} h={14} heavy />
      <Solid x={1135} y={233} w={60} h={28} r={2} />
      <Bar x={949} y={314} w={340} h={10} />
      <Bar x={949} y={335} w={330} h={10} />
      <Bar x={949} y={356} w={60} h={10} />
      <rect x={949} y={387} width={344} height={77} rx={2} strokeWidth="2" strokeDasharray="6 5" className="fill-none stroke-electric/40" />
      <Block x={926} y={510} w={392} h={400} r={0} />
      <Solid x={926} y={510} w={392} h={7} r={0} />
      <Bar x={998} y={540} w={80} h={14} heavy />
      <Bar x={998} y={562} w={40} h={14} heavy />
      <Outline x={1120} y={542} w={78} h={28} r={2} />
      <circle cx={1226} cy={556} r={15} strokeWidth="3" className="fill-none stroke-electric/40" />
      <Bar x={949} y={634} w={324} h={10} />
      <Bar x={949} y={655} w={268} h={10} />
      {[707, 818].map((y) => (
        <g key={y}>
          <Outline x={949} y={y} w={344} h={104} r={2} />
          <Outline x={966} y={y + 14} w={16} h={16} r={2} />
          <Bar x={995} y={y + 15} w={280} h={12} heavy />
          <Bar x={995} y={y + 42} w={260} h={9} />
          <Bar x={995} y={y + 62} w={250} h={9} />
        </g>
      ))}
    </Svg>
  );
}

function Aloys() {
  const nav = [[372, 40], [440, 60], [528, 104], [662, 106], [797, 30], [855, 100], [983, 72], [1088, 115]];
  return (
    <Svg k="aloys">
      <Photo x={0} y={0} w={1440} h={900} />
      <ellipse cx={720} cy={460} rx={300} ry={420} className="fill-electric/10" />
      <Outline x={152} y={16} w={52} h={52} r={2} />
      {nav.map(([x, w]) => (
        <Bar key={x} x={x} y={36} w={w} h={11} heavy />
      ))}
      <Outline x={1217} y={24} w={70} h={34} r={17} />
      <Bar x={548} y={322} w={345} h={20} tone="fill-electric/45" />
      <Bar x={375} y={380} w={690} h={58} heavy />
      <Bar x={537} y={460} w={366} h={58} heavy />
      <Solid x={494} y={553} w={235} h={55} />
      <rect x={743} y={553} width={203} height={55} rx={4} className="fill-paper" />
      <Bar x={772} y={575} w={145} h={12} tone="fill-electric/45" />
      <circle cx={1392} cy={784} r={28} className="fill-electric/35" />
      <circle cx={1392} cy={852} r={28} className="fill-electric/35" />
      {[650, 678, 706, 734, 762, 790].map((cx, i) => (
        <circle key={cx} cx={cx} cy={868} r={5} strokeWidth="2" className={i === 1 ? "fill-ink/40 stroke-ink/40" : "fill-none stroke-ink/40"} />
      ))}
    </Svg>
  );
}

// A spade, centred on 0,0, about 210 px tall.
const SPADE =
  "M0 -105 C40 -55 105 -20 100 30 C96 70 50 80 18 55 C25 85 35 100 50 108 L-50 108 C-35 100 -25 85 -18 55 C-50 80 -96 70 -100 30 C-105 -20 -40 -55 0 -105 Z";

function Spades() {
  return (
    <Svg k="spades">
      <circle cx={1330} cy={320} r={170} className="fill-electric/8" />
      <path d={SPADE} transform="translate(150 44) scale(0.17)" className="fill-electric/45" />
      <Bar x={173} y={30} w={68} h={11} heavy />
      <Bar x={173} y={46} w={68} h={8} />
      <Bar x={605} y={38} w={38} h={11} heavy />
      <Solid x={605} y={59} w={38} h={2} r={0} />
      <Bar x={676} y={38} w={55} h={11} />
      <Bar x={765} y={38} w={52} h={11} />
      <Solid x={1179} y={18} w={131} h={54} r={27} />
      <rect x={0} y={92} width={1440} height={2} className="fill-ink/8" />
      <path d={SPADE} transform="translate(139 214) scale(0.06)" className="fill-electric/45" />
      <Bar x={155} y={209} w={365} h={9} />
      <Bar x={130} y={265} w={515} h={58} heavy />
      <Bar x={130} y={342} w={395} h={56} tone="fill-electric/35" />
      <Bar x={130} y={420} w={265} h={56} tone="fill-electric/35" />
      {[[515, 550], [552, 520], [589, 548], [626, 250]].map(([y, w]) => (
        <Bar key={y} x={130} y={y} w={w} h={16} />
      ))}
      <Solid x={130} y={687} w={219} h={63} r={31} />
      <Outline x={365} y={687} w={196} h={63} r={31} />
      <Bar x={130} y={780} w={400} h={10} />
      <circle cx={1073} cy={500} r={237} strokeWidth="2" className="fill-none stroke-electric/40" />
      <circle cx={1073} cy={500} r={213} strokeWidth="4" strokeDasharray="1 14" strokeLinecap="round" className="fill-none stroke-electric/40" />
      <circle cx={888} cy={500} r={5} className="fill-electric/40" />
      <circle cx={1258} cy={500} r={5} className="fill-electric/40" />
      <path d={SPADE} transform="translate(1073 500)" className="fill-electric/35" />
      <rect x={0} y={893} width={1440} height={2} className="fill-ink/8" />
    </Svg>
  );
}

function Danella() {
  const id = useId();
  return (
    <Svg k="danella">
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopOpacity="0.22" style={{ stopColor: "rgb(var(--c-electric))" }} />
          <stop offset="1" stopOpacity="0" style={{ stopColor: "rgb(var(--c-electric))" }} />
        </radialGradient>
      </defs>
      <circle cx={1120} cy={430} r={420} fill={`url(#${id})`} />
      <circle cx={330} cy={60} r={220} fill={`url(#${id})`} />
      <Bar x={184} y={24} w={68} h={17} heavy />
      {[[483, 47], [566, 70], [672, 48], [756, 111], [903, 63]].map(([x, w]) => (
        <Bar key={x} x={x} y={25} w={w} h={13} />
      ))}
      <Bar x={1197} y={25} w={60} h={13} heavy />
      <Bar x={184} y={228} w={190} h={9} tone="fill-electric/45" />
      <Bar x={186} y={280} w={240} h={55} heavy />
      <Bar x={200} y={356} w={250} h={46} tone="fill-ink/18" />
      {[[448, 545], [476, 560], [504, 205]].map(([y, w]) => (
        <Bar key={y} x={184} y={y} w={w} h={15} />
      ))}
      <Solid x={184} y={566} w={193} h={46} r={23} />
      <Outline x={393} y={566} w={135} h={46} r={23} />
      <rect x={184} y={778} width={40} height={2} className="fill-ink/25" />
      <Bar x={236} y={775} w={50} h={8} />
    </Svg>
  );
}

function Kahatagaha() {
  const strip = ["fill-ink/45", "fill-ink/30", "fill-ink/15", "fill-electric/10"];
  return (
    <Svg k="kahatagaha">
      <Bar x={160} y={76} w={275} h={8} />
      <Bar x={160} y={112} w={545} h={40} heavy />
      {[[176, 540], [201, 555], [226, 155]].map(([y, w]) => (
        <Bar key={y} x={160} y={y} w={w} h={13} />
      ))}
      {[188, 732].map((x) => (
        <g key={x}>
          <Block x={x} y={290} w={520} h={620} r={0} />
          <Photo x={x} y={290} w={520} h={318} />
          {strip.map((tone, i) => (
            <rect key={i} x={x + i * 130} y={608} width={130} height={6} className={tone} />
          ))}
          <Bar x={x + 27} y={645} w={70} h={8} />
          <Bar x={x + 27} y={676} w={x === 188 ? 55 : 72} h={20} heavy />
          {[[718, 435], [741, 440], [765, 340]].map(([y, w]) => (
            <Bar key={y} x={x + 27} y={y} w={w} h={12} />
          ))}
          <rect x={x + 27} y={796} width={466} height={2} className="fill-ink/10" />
          {[[0, 118], [127, 105], [241, 78]].map(([dx, w]) => (
            <Outline key={dx} x={x + 27 + dx} y={815} w={w} h={28} r={2} />
          ))}
          <Bar x={x + 27} y={876} w={108} h={12} heavy />
        </g>
      ))}
    </Svg>
  );
}

// The V3 hero itself, mini ASCII portrait included: the card is recursive.
function Portfolio() {
  return (
    <Svg k="portfolio">
      <ellipse cx={1040} cy={360} rx={420} ry={330} className="fill-sky/60" />
      <Bar x={40} y={35} w={160} h={10} />
      {[[527, 42], [602, 33], [669, 67], [769, 50], [853, 59]].map(([x, w]) => (
        <Bar key={x} x={x} y={35} w={w} h={9} />
      ))}
      <circle cx={1216} cy={40} r={15} strokeWidth="2" className="fill-none stroke-ink/25" />
      <circle cx={1252} cy={40} r={4} className="fill-electric/60" />
      <Bar x={1263} y={35} w={137} h={9} />
      <Bar x={40} y={115} w={187} h={8} />
      <Bar x={40} y={136} w={162} h={8} />
      <Bar x={1357} y={115} w={42} h={8} />
      <Bar x={1271} y={136} w={128} h={8} />
      <Bar x={760} y={170} w={222} h={8} />
      <Solid x={1265} y={165} w={135} h={37} r={0} />
      <Bar x={40} y={211} w={414} h={8} />
      <rect x={42} y={255} width={488} height={138} rx={6} className="fill-ink/30" />
      <rect x={42} y={405} width={170} height={140} rx={6} className="fill-electric/45" />
      <rect x={245} y={405} width={352} height={140} rx={6} className="fill-ink/30" />
      {[422, 360, 378, 388, 370, 82].map((w, i) => (
        <Bar key={i} x={40} y={635 + i * 28} w={w} h={17} tone="fill-ink/20" />
      ))}
      <g className="fill-electric" style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700 }}>
        {MINI_PORTRAIT.map((row, r) => (
          <text key={r} x={826} y={290 + r * 25} xmlSpace="preserve">
            {row}
          </text>
        ))}
      </g>
    </Svg>
  );
}

// Upcoming cards: a plain site shape, nothing of the real design.
function Generic() {
  return (
    <Svg k="generic">
      <Bar x={120} y={40} w={120} h={16} heavy />
      {[880, 980, 1080, 1180].map((x) => (
        <Bar key={x} x={x} y={42} w={70} h={11} />
      ))}
      <Solid x={1270} y={30} w={50} h={34} />
      <Bar x={420} y={250} w={600} h={48} heavy />
      <Bar x={500} y={312} w={440} h={48} heavy />
      <Bar x={470} y={390} w={500} h={12} />
      <Bar x={540} y={414} w={360} h={12} />
      <Solid x={640} y={456} w={160} h={44} />
      {[120, 530, 940].map((x) => (
        <g key={x}>
          <Block x={x} y={560} w={380} h={230} />
          <Photo x={x} y={560} w={380} h={130} />
          <Bar x={x + 24} y={712} w={200} h={14} heavy />
          <Bar x={x + 24} y={740} w={300} h={10} />
          <Bar x={x + 24} y={758} w={250} h={10} />
        </g>
      ))}
      <rect x={0} y={830} width={1440} height={70} className="fill-electric/10" />
    </Svg>
  );
}

function Empty() {
  return <Svg k="empty" />;
}

export const SKELETONS = {
  portfolio: Portfolio,
  dashboard: Dashboard,
  aloys: Aloys,
  spades: Spades,
  danella: Danella,
  kahatagaha: Kahatagaha,
  generic: Generic,
  empty: Empty,
};

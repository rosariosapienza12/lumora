/**
 * Zib, the Lumora assistant: a round green alien in a little flying saucer.
 * Pure SVG; the floating, blinking and blinking lights are CSS (see
 * `.zib-*` in globals.css) so they pause with reduced motion.
 */
export function AlienShip({ className = "", beam = false, thinking = false, still = false }: { className?: string; beam?: boolean; thinking?: boolean; still?: boolean }) {
  return (
    <svg viewBox="0 -8 120 128" className={`${className} ${thinking ? "zib-thinking" : ""} ${still ? "zib-still" : ""}`} aria-hidden>
      <defs>
        <radialGradient id="zib-skin" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#b8ff9a" />
          <stop offset="0.55" stopColor="#6fe36b" />
          <stop offset="1" stopColor="#38b85a" />
        </radialGradient>
        <linearGradient id="zib-hull" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e9e4ff" />
          <stop offset="0.45" stopColor="#a594ff" />
          <stop offset="1" stopColor="#5b3df5" />
        </linearGradient>
        <linearGradient id="zib-belly" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5b3df5" />
          <stop offset="1" stopColor="#2a1a8f" />
        </linearGradient>
        <radialGradient id="zib-dome" cx="40%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#bdf3ff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#7fd8ff" stopOpacity="0.35" />
        </radialGradient>
        <linearGradient id="zib-beam" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff2b0" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffb547" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Tractor beam, shown while the chat is open */}
      <path className="zib-beam" d="M44 86 L76 86 L94 120 L26 120 Z" fill="url(#zib-beam)" opacity={beam ? 1 : 0} />

      <g className="zib-float">
        {/* Alien, sitting in the dome */}
        <g className="zib-alien">
          {/* antenna */}
          <path d="M60 22 Q58 14 63 9" stroke="#4cc25e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle className="zib-antenna" cx="64" cy="8" r="4.5" fill="#ffd36b" />
          {/* head */}
          <ellipse cx="60" cy="42" rx="20" ry="18" fill="url(#zib-skin)" />
          {/* ears */}
          <ellipse cx="39" cy="41" rx="5" ry="7" fill="#5fd668" transform="rotate(-20 39 41)" />
          <ellipse cx="81" cy="41" rx="5" ry="7" fill="#5fd668" transform="rotate(20 81 41)" />
          {/* eyes */}
          <g className="zib-eyes">
            <ellipse cx="52" cy="40" rx="6.5" ry="8" fill="#1d1640" />
            <ellipse cx="68" cy="40" rx="6.5" ry="8" fill="#1d1640" />
            <circle cx="54.5" cy="36.5" r="2.6" fill="#fff" />
            <circle cx="70.5" cy="36.5" r="2.6" fill="#fff" />
            <circle cx="50.5" cy="43" r="1.2" fill="#fff" opacity="0.8" />
            <circle cx="66.5" cy="43" r="1.2" fill="#fff" opacity="0.8" />
          </g>
          {/* cheeks and smile */}
          <ellipse cx="45" cy="50" rx="3.6" ry="2.2" fill="#ff8fb1" opacity="0.75" />
          <ellipse cx="75" cy="50" rx="3.6" ry="2.2" fill="#ff8fb1" opacity="0.75" />
          <path d="M55 51 Q60 56 65 51" stroke="#1d1640" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>

        {/* Glass dome */}
        <path d="M32 62 A28 30 0 0 1 88 62 Z" fill="url(#zib-dome)" stroke="#d9f6ff" strokeOpacity="0.6" strokeWidth="1.5" />
        <path d="M40 46 Q44 34 56 30" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Saucer */}
        <ellipse cx="60" cy="74" rx="34" ry="9" fill="url(#zib-belly)" />
        <ellipse cx="60" cy="66" rx="48" ry="12" fill="url(#zib-hull)" />
        <ellipse cx="60" cy="62.5" rx="40" ry="5" fill="#ffffff" opacity="0.35" />
        {/* Rim lights */}
        {[22, 36, 50, 60, 70, 84, 98].map((x, i) => (
          <circle key={x} className="zib-light" style={{ animationDelay: `${i * 0.18}s` }} cx={x} cy={x === 60 ? 72 : 70.5 - Math.abs(x - 60) * 0.02} r="2.6" fill={i % 2 ? "#ffd36b" : "#7fffd4"} />
        ))}
        <ellipse cx="60" cy="82" rx="10" ry="3" fill="#ffd36b" opacity="0.9" />
      </g>
    </svg>
  );
}

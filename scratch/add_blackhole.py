with open("components/landing/HeroVisual.tsx", "r") as f:
    content = f.read()

# 1. Add gradients and clip paths to <defs>
defs_needle = "        {/* Shooting Meteor Gradients */}"
new_defs = """        {/* Distant Black Hole Gradients & Clips */}
        <radialGradient id="blackholeLensingGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0B1C33" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#0E294D" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#051224" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#020304" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="lensingArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4DA3FF" stopOpacity="0" />
          <stop offset="25%" stopColor="#A9C8EE" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="75%" stopColor="#A9C8EE" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#4DA3FF" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="accretionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#A9C8EE" stopOpacity="0.5" />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#A9C8EE" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#6C8DB5" stopOpacity="0.4" />
        </linearGradient>

        <clipPath id="bhBack"><rect x="-200" y="-200" width="400" height="200" /></clipPath>
        <clipPath id="bhFront"><rect x="-200" y="0" width="400" height="200" /></clipPath>

        {/* Shooting Meteor Gradients */}"""

if defs_needle in content:
    content = content.replace(defs_needle, new_defs, 1)
else:
    print("Error: defs needle not found!")

# 2. Add Black Hole component in the top-left area
# Place right after the meteors or before the primary visual group
bh_needle = "      {/* Primary Visual Group with Restrained Parallax */}"
new_bh = """      {/* ============================================================== */}
      {/* DISTANT BLACK HOLE WITH ACCRETION DISK (Top-Left Cosmic Void) */}
      {/* ============================================================== */}
      <g transform="translate(195 165)" className="pointer-events-none select-none">
        {/* Gravitational Lensing Ambient Halo */}
        <circle r="54" fill="url(#blackholeLensingGlow)" opacity="0.75" />

        {/* Outer Gravitational Lensing Distorted Light Ring */}
        <ellipse
          rx="40"
          ry="38"
          fill="none"
          stroke="#A9C8EE"
          strokeWidth="0.6"
          opacity="0.25"
          strokeDasharray="4 8"
        />

        {/* Gravitationally Lensed Upper Accretion Arc (Interstellar curved light) */}
        <path
          d="M -32 2 C -32 -26, 32 -26, 32 2"
          fill="none"
          stroke="url(#lensingArcGrad)"
          strokeWidth="3.0"
          strokeLinecap="round"
          filter="url(#starGlow)"
          opacity="0.85"
        />
        <path
          d="M -25 -2 C -25 -20, 25 -20, 25 -2"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Distant Accretion Disk (Tilted Elliptical Ring) */}
        <g transform="rotate(-24)">
          {/* Background Accretion Disk Half (behind Horizon) */}
          <g clipPath="url(#bhBack)">
            <ellipse rx="38" ry="8" fill="none" stroke="url(#accretionGrad)" strokeWidth="2.8" opacity="0.75" />
            <ellipse rx="44" ry="9.5" fill="none" stroke="#A9C8EE" strokeWidth="0.8" opacity="0.4" strokeDasharray="6 12" />
          </g>

          {/* Pitch-Black Event Horizon Void */}
          <circle r="13.5" fill="#000000" />
          {/* Ultra-sharp Photon Sphere Ring */}
          <circle r="14.2" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.95" filter="url(#starGlow)" />
          <circle r="13.5" fill="none" stroke="#A9C8EE" strokeWidth="0.75" opacity="0.8" />

          {/* Foreground Accretion Disk Half (in front of Horizon) */}
          <g clipPath="url(#bhFront)">
            <ellipse rx="38" ry="8" fill="none" stroke="url(#accretionGrad)" strokeWidth="3.2" opacity="0.95" />
            <ellipse
              className="ringflow"
              rx="38"
              ry="8"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.6"
              strokeDasharray="30 20 10 20"
              opacity="0.9"
              style={{ animationDuration: "12s" }}
            />
            <ellipse rx="44" ry="9.5" fill="none" stroke="#A9C8EE" strokeWidth="1.0" opacity="0.6" strokeDasharray="4 8" />
          </g>

          {/* Orbiting Accretion Matter Sparkles */}
          <g className="spin" style={{ animationDuration: "14s" }}>
            <g transform="translate(38 0)">
              <circle r="1.5" fill="#FFFFFF" filter="url(#starGlow)" />
              <circle r="4" fill="#A9C8EE" opacity="0.4" />
            </g>
            <g transform="translate(-38 0)">
              <circle r="1.2" fill="#FFFFFF" />
            </g>
          </g>
        </g>

        {/* Distant Singularity Telemetry Label */}
        <text
          x="0"
          y="42"
          textAnchor="middle"
          className="mono text-[8px] tracking-[0.22em]"
          fill="#8E929B"
          opacity="0.6"
        >
          SINGULARITY · 0.42 LY
        </text>
      </g>

      {/* Primary Visual Group with Restrained Parallax */}"""

if bh_needle in content:
    content = content.replace(bh_needle, new_bh, 1)
else:
    print("Error: bh needle not found!")

with open("components/landing/HeroVisual.tsx", "w") as f:
    f.write(content)

print("Black hole added successfully to HeroVisual.tsx!")

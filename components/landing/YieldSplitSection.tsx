"use client";

import React from "react";

export function YieldSplitSection() {
  return (
    <section id="how" className="pt-20 sm:pt-28 lg:pt-36">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 gap-7 sm:gap-12 lg:gap-20 items-end">
        <div className="flex flex-col gap-5 sm:gap-6">
          <div className="mono text-[12px] tracking-[0.18em] text-muted-dark">
            01 — THE SPLIT
          </div>
          <h2 className="m-0 text-[36px] sm:text-[46px] lg:text-[60px] leading-[1.04] font-normal tracking-[-0.03em] text-balance">
            One asset.
            <br />
            Two ways to own its yield.
          </h2>
        </div>
        <p className="m-0 text-[17px] sm:text-[18px] leading-[1.6] text-muted font-light max-w-[500px] text-pretty">
          USDG in a lending vault earns a rate that changes every day. We split
          that position at today&apos;s date: one side holds steady to maturity,
          the other rides the rate.
        </p>
      </div>

      {/* Yield Split SVG Illustration */}
      <div className="mt-8 sm:mt-12 lg:mt-14 overflow-x-auto">
        <div className="min-w-[800px] lg:min-w-full">
          <svg
            viewBox="0 0 1440 600"
            className="block w-full h-auto"
            role="img"
            aria-label="A USDG vault position enters from the left, splits today into a steady Fixed Yield path and a floating Long Yield path, and both reach maturity on 26 March 2027."
          >
            <g stroke="rgba(236,237,234,0.06)" strokeWidth="1">
              <path d="M420 120 V560" />
              <path d="M554 120 V560" />
              <path d="M687 120 V560" />
              <path d="M826 120 V560" />
              <path d="M964 120 V560" />
              <path d="M1089 120 V560" />
            </g>

            <path
              d="M0 560 H1440"
              stroke="rgba(236,237,234,0.14)"
              strokeWidth="1"
            />

            <g
              className="mono"
              fontSize="12"
              letterSpacing="0.12em"
              fill="#6F7471"
            >
              <text x="420" y="586" textAnchor="middle" fill="#ECEDEA">
                TODAY
              </text>
              <text x="554" y="586" textAnchor="middle">
                NOV
              </text>
              <text x="687" y="586" textAnchor="middle">
                DEC
              </text>
              <text x="826" y="586" textAnchor="middle">
                JAN
              </text>
              <text x="964" y="586" textAnchor="middle">
                FEB
              </text>
              <text x="1089" y="586" textAnchor="middle">
                MAR
              </text>
            </g>

            <path
              d="M1200 110 V560"
              stroke="rgba(236,237,234,0.55)"
              strokeWidth="1"
              strokeDasharray="3 6"
            />

            <g className="mono fade" fontSize="12" letterSpacing="0.14em">
              <text x="1214" y="128" fill="#ECEDEA">
                MATURITY
              </text>
              <text x="1214" y="148" fill="#8E9390">
                26 MAR 2027
              </text>
            </g>

            {/* USDG Vault input path */}
            <path
              className="draw"
              d="M0 330 H420"
              stroke="#ECEDEA"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              className="flow slow"
              d="M0 330 H420"
              stroke="#ECEDEA"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />

            <g className="mono" fontSize="12" letterSpacing="0.12em">
              <text x="40" y="306" fill="#ECEDEA">
                USDG LENDING VAULT
              </text>
              <text x="40" y="360" fill="#8E9390">
                RATE NOW · 7.10%
              </text>
            </g>

            {/* Fixed Yield Path (Ice blue) */}
            <path
              className="draw d2"
              d="M420 330 C470 330 490 232 545 232 L1200 214"
              stroke="#A9C8EE"
              strokeWidth="1.6"
              fill="none"
            />
            <path
              className="flow"
              d="M420 330 C470 330 490 232 545 232 L1200 214"
              stroke="#A9C8EE"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />

            <g className="mono fade" fontSize="12" letterSpacing="0.12em">
              <text x="560" y="206" fill="#A9C8EE">
                FIXED YIELD · HOLDS AT 6.42%
              </text>
              <text x="1214" y="210" fill="#A9C8EE">
                PAYS 1 : 1
              </text>
              <text x="1214" y="230" fill="#A9C8EE">
                IN USDG
              </text>
            </g>
            <circle className="fade" cx="1200" cy="214" r="5" fill="#A9C8EE" />

            {/* Long Yield Path (Amber wave) */}
            <path
              className="draw d3"
              d="M420 330 C470 330 490 430 540 430 C580 430 600 398 622 398 C645 398 665 462 705 462 C745 462 765 404 788 404 C812 404 830 452 870 452 C910 452 930 410 953 410 C977 410 995 446 1035 446 C1075 446 1095 418 1118 418 C1142 418 1160 436 1200 436"
              stroke="#F0A85C"
              strokeWidth="1.6"
              fill="none"
            />
            <path
              className="flow"
              d="M420 330 C470 330 490 430 540 430 C580 430 600 398 622 398 C645 398 665 462 705 462 C745 462 765 404 788 404 C812 404 830 452 870 452 C910 452 930 410 953 410 C977 410 995 446 1035 446 C1075 446 1095 418 1118 418 C1142 418 1160 436 1200 436"
              stroke="#F0A85C"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />

            <g className="mono fade" fontSize="12" letterSpacing="0.12em">
              <text x="560" y="506" fill="#F0A85C">
                LONG YIELD · FLOATS WITH THE RATE
              </text>
              <text x="1214" y="432" fill="#F0A85C">
                YIELD PAID OUT,
              </text>
              <text x="1214" y="452" fill="#F0A85C">
                ENDS AT ZERO
              </text>
            </g>
            <circle
              className="fade"
              cx="1200"
              cy="436"
              r="5"
              fill="none"
              stroke="#F0A85C"
              strokeWidth="1.6"
            />

            {/* Split junction node */}
            <circle
              cx="420"
              cy="330"
              r="20"
              fill="none"
              stroke="rgba(236,237,234,0.5)"
              strokeWidth="1"
            />
            <circle cx="420" cy="330" r="6" fill="#ECEDEA" />
          </svg>
        </div>
      </div>

      {/* Summary cards below the diagram */}
      <div className="max-w-[1240px] mx-auto mt-8 sm:mt-12 lg:mt-14 px-4 sm:px-6 lg:px-10 grid grid-cols-1 md:grid-cols-3 gap-7">
        <div className="flex flex-col gap-3 pt-4 border-t-2 border-ice">
          <span className="text-[20px] text-foreground font-normal">
            Fixed Yield
          </span>
          <span className="text-[16px] leading-[1.55] text-muted">
            Worth exactly 1 USDG at maturity, bought below 1 today. The gap is
            your locked return.
          </span>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t-2 border-amber">
          <span className="text-[20px] text-foreground font-normal">
            Long Yield
          </span>
          <span className="text-[16px] leading-[1.55] text-muted">
            Collects all the yield until maturity, then ends at zero. You win if
            the rate stays high.
          </span>
        </div>

        <div className="flex flex-col gap-3 pt-4 border-t-2 border-white/40">
          <span className="mono text-[18px] text-foreground">
            <span className="text-ice">Fixed</span> +{" "}
            <span className="text-amber">Long</span> = 1 USDG earning yield
          </span>
          <span className="mono text-[12px] tracking-[0.1em] text-muted-dark">
            UNDER THE HOOD: PT + YT
          </span>
        </div>
      </div>
    </section>
  );
}

import { ImageResponse } from "next/og";
import { daysUntil2027, danaLabel } from "@/lib/date";

export const alt = "eRačun Semafor — provjera spremnosti za Fiskalizaciju 2.0";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Odbrojavanje mora biti točno i na dijeljenoj sličici.
export const revalidate = 3600;

// Satori traži eksplicitan display na svakom čvoru s više od jednog djeteta,
// a svaki JSX izraz broji kao zaseban čvor. Zato je display naveden svugdje.
const row = { display: "flex", alignItems: "center" } as const;
const col = { display: "flex", flexDirection: "column" } as const;

export default async function Image() {
  const days = daysUntil2027();

  return new ImageResponse(
    (
      <div
        style={{
          ...col,
          width: "100%",
          height: "100%",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ ...row, gap: 14 }}>
          <div style={{ ...col, gap: 5, background: "#0b1220", padding: 6, borderRadius: 6 }}>
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, background: "#a81f16" }} />
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, background: "#e0a53a" }} />
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, background: "#15613f" }} />
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#0b1220" }}>
            eRačun Semafor
          </div>
        </div>

        <div style={col}>
          <div style={{ display: "flex", fontSize: 66, lineHeight: 1.12, color: "#0b1220", letterSpacing: -1.5 }}>
            Znate li točno što se od
          </div>
          <div style={{ display: "flex", fontSize: 66, lineHeight: 1.12, color: "#0b1220", letterSpacing: -1.5 }}>
            eRačuna odnosi baš na vas?
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 29, color: "#3d4a63" }}>
            Besplatna provjera u dvije minute. Izvještaj s rokovima i člancima zakona.
          </div>
        </div>

        <div
          style={{
            ...row,
            justifyContent: "space-between",
            borderTop: "1px solid #e3e7ef",
            paddingTop: 28,
          }}
        >
          <div style={{ ...row, alignItems: "baseline", gap: 12 }}>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color: "#14417a" }}>
              {String(days)}
            </div>
            <div style={{ display: "flex", fontSize: 26, color: "#3d4a63" }}>
              {`${danaLabel(days)} do 1.1.2027.`}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#6b7893" }}>
            Zakon o fiskalizaciji, NN 89/2025
          </div>
        </div>
      </div>
    ),
    size,
  );
}

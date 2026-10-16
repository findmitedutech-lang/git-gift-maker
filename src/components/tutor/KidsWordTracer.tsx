import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Eraser, SkipForward, Star, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KIDS_WORDS } from "@/lib/kids-words";
import { speakLong } from "@/lib/ama-voice";

const W = 900;
const H = 360;
const PASS = 0.7;

function shuffled<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fontFor(word: string) {
  const size = Math.min(230, Math.floor((W * 0.9) / (word.length * 0.62)));
  return `700 ${size}px "Comic Sans MS", "Chalkboard SE", "Trebuchet MS", sans-serif`;
}

/** Kids class: Ama shows a picture, the child traces the dotted word with a finger. */
export function KidsWordTracer({ onBack }: { onBack: () => void }) {
  const [deck] = useState(() => shuffled(KIDS_WORDS));
  const [i, setI] = useState(0);
  const [stars, setStars] = useState(0);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<Uint8ClampedArray | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const item = deck[i % deck.length];
  const word = item.word.toUpperCase();

  const say = useCallback((text: string, onDone?: () => void) => {
    stopRef.current?.();
    stopRef.current = speakLong(text, onDone);
  }, []);

  const announce = useCallback(() => {
    say(`${item.word}. ${word.split("").join(", ")}. ${item.word}. Trace the word with your finger.`);
  }, [item.word, word, say]);

  // Draw dotted guide and build the target mask.
  useEffect(() => {
    const g = guideRef.current!.getContext("2d")!;
    g.clearRect(0, 0, W, H);
    g.font = fontFor(word);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 6;
    g.setLineDash([4, 14]);
    g.lineCap = "round";
    g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground") ? "#8a8f98" : "#888";
    g.strokeText(word, W / 2, H / 2 + 10);
    // Midline guides
    g.setLineDash([10, 10]);
    g.lineWidth = 2;
    g.strokeStyle = "#c9cdd3";
    g.beginPath();
    g.moveTo(20, H / 2 + 10);
    g.lineTo(W - 20, H / 2 + 10);
    g.stroke();

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const o = off.getContext("2d")!;
    o.font = fontFor(word);
    o.textAlign = "center";
    o.textBaseline = "middle";
    o.lineWidth = 8;
    o.strokeStyle = "#000";
    o.strokeText(word, W / 2, H / 2 + 10);
    maskRef.current = o.getImageData(0, 0, W, H).data;

    drawRef.current!.getContext("2d")!.clearRect(0, 0, W, H);
    setDone(false);
    setProgress(0);
    const t = setTimeout(announce, 300);
    return () => clearTimeout(t);
  }, [word, announce]);

  useEffect(() => () => stopRef.current?.(), []);

  const check = () => {
    const mask = maskRef.current;
    if (!mask || done) return;
    const d = drawRef.current!.getContext("2d")!.getImageData(0, 0, W, H).data;
    let total = 0;
    let hit = 0;
    let stray = 0;
    let drawn = 0;
    for (let p = 3; p < mask.length; p += 16) {
      const inMask = mask[p] > 0;
      const inDraw = d[p] > 0;
      if (inMask) {
        total++;
        if (inDraw) hit++;
      }
      if (inDraw) {
        drawn++;
        if (!inMask) stray++;
      }
    }
    const cover = total ? hit / total : 0;
    setProgress(Math.round(Math.min(1, cover / PASS) * 100));
    // Reward good coverage, but not scribbling over the whole board.
    if (cover >= PASS && drawn && stray / drawn < 0.75) {
      setDone(true);
      setStars((s) => s + 1);
      say(`Well done! ${word.split("").join(", ")}. ${item.word}!`, () => setI((n) => n + 1));
    }
  };

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (done) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const p = point(e);
    const c = drawRef.current!.getContext("2d")!;
    c.strokeStyle = "#f97316";
    c.lineWidth = 28;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(last.current.x, last.current.y);
    c.lineTo(p.x, p.y);
    c.stroke();
    last.current = p;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    check();
  };

  const clear = () => {
    drawRef.current!.getContext("2d")!.clearRect(0, 0, W, H);
    setProgress(0);
  };

  return (
    <section className="px-4 py-3">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" className="gap-1 px-2" onClick={onBack}>
          <ArrowLeft className="size-4" /> Classes
        </Button>
        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
          <Star className="size-4 fill-current" /> {stars}
        </span>
      </div>

      <div className="mt-3 flex flex-col items-center rounded-3xl border border-border bg-surface p-4">
        <button type="button" onClick={announce} className="text-[96px] leading-none" aria-label={`Hear ${item.word}`}>
          {item.emoji}
        </button>
        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">{item.theme}</p>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-3xl border-2 border-dashed border-border bg-background">
        <canvas ref={guideRef} width={W} height={H} className="block h-auto w-full" />
        <canvas
          ref={drawRef}
          width={W}
          height={H}
          className="absolute inset-0 h-full w-full"
          style={{ touchAction: "none" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
        />
        {done && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60">
            <span className="animate-bounce text-6xl">⭐🎉⭐</span>
          </div>
        )}
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button variant="secondary" className="h-14 gap-2 text-base" onClick={announce}>
          <Volume2 className="size-5" /> Hear
        </Button>
        <Button variant="secondary" className="h-14 gap-2 text-base" onClick={clear}>
          <Eraser className="size-5" /> Clear
        </Button>
        <Button variant="secondary" className="h-14 gap-2 text-base" onClick={() => setI((n) => n + 1)}>
          <SkipForward className="size-5" /> Next
        </Button>
      </div>
    </section>
  );
}

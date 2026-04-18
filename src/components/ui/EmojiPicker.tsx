import { useState } from "react";

interface Category {
  label: string;
  icon: string;
  emojis: string[];
}

const CATEGORIES: Category[] = [
  {
    label: "Smileys",
    icon: "😀",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩",
      "😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐",
      "🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒",
      "🤕","🤢","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥸","😎","🤓","🧐","😕","😟","🙁",
      "😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞",
      "😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺",
    ],
  },
  {
    label: "People",
    icon: "👋",
    emojis: [
      "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆",
      "🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️",
      "💅","🤳","💪","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","🦴","👀","👁️","👅",
      "👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","🙍","🙎","🙅","🙆",
      "💁","🙋","🧏","🙇","🤦","🤷","👮","🕵️","💂","🥷","👷","🤴","👸","👳","👲","🧕",
    ],
  },
  {
    label: "Nature",
    icon: "🌿",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈",
      "🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛",
      "🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐",
      "🌸","🌺","🌻","🌹","🌷","💐","🌿","🍀","🍁","🍂","🍃","🌲","🌳","🌴","🌵","🎋",
      "☀️","🌤️","⛅","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","🌪️","🌫️","🌈","☔","⚡","🔥","💧",
    ],
  },
  {
    label: "Food",
    icon: "🍕",
    emojis: [
      "🍎","🍊","🍋","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🫒","🥑",
      "🍆","🥦","🥬","🥒","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀",
      "🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🫓","🥪","🥙",
      "🧆","🌮","🌯","🫔","🥗","🥘","🫕","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤",
      "🍚","🍙","🍘","🍥","🥮","🍡","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪",
      "🌰","🥜","🍯","🧃","🥤","🧋","☕","🍵","🧉","🍺","🍻","🥂","🍷","🥃","🍸","🍾",
    ],
  },
  {
    label: "Activities",
    icon: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🏐","🏉","🥏","🎾","🏸","🏒","🏑","🥍","🏏","🪃","🥅",
      "⛳","🎿","🛷","🥌","🎯","🪀","🪁","🎱","🔮","🎮","🕹️","🎲","♟️","🎭","🎨","🖼️",
      "🎰","🧩","🎪","🎤","🎧","🎼","🎵","🎶","🎷","🎸","🎹","🎺","🎻","🥁","🪘","🎤",
      "🏆","🥇","🥈","🥉","🏅","🎖️","🏵️","🎗️","🎟️","🎫","🎀","🎁","🎊","🎉","🎈","🎋",
      "🎍","🎎","🎏","🎐","🧧","🎑","🎃","🎄","🎆","🎇","🧨","✨","🎍","🎊","🎋","🎑",
    ],
  },
  {
    label: "Objects",
    icon: "💡",
    emojis: [
      "📱","💻","🖥️","🖨️","⌨️","🖱️","🖲️","💾","💿","📀","🎥","📷","📸","📹","📼","🔭",
      "🔬","📡","📺","📻","🎙️","📞","☎️","📟","📠","🔋","🔌","💡","🔦","🕯️","🪔","🧯",
      "🛢️","💸","💵","💴","💶","💷","💰","💳","💎","⚖️","🔑","🗝️","🔨","🪓","⛏️","⚒️",
      "🛠️","🗡️","⚔️","🔫","🪃","🏹","🛡️","🪚","🔧","🪛","🔩","⚙️","🗜️","⛓️","🪝","🧲",
      "🪜","🧰","🧲","🔮","🪬","🗿","🗺️","🧭","⏱️","⏰","⏲️","⌚","📅","📆","🗒️","📋",
      "📌","📍","✂️","🗃️","🗄️","🗑️","🔏","🔐","🔒","🔓","📦","📫","📪","📬","📭","📮",
    ],
  },
];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
}

export function EmojiPicker({ onPick }: EmojiPickerProps) {
  const [activeCat, setActiveCat] = useState(0);
  const [search, setSearch] = useState("");

  const displayEmojis = search.trim()
    ? CATEGORIES.flatMap((c) => c.emojis).filter(() => true) // search just shows all (no text data)
    : CATEGORIES[activeCat].emojis;

  // When searching, show emojis from all categories (basic substring not possible without names,
  // so we just show all emojis and let the user browse visually)
  const emojis = search.trim() ? CATEGORIES.flatMap((c) => c.emojis) : displayEmojis;

  return (
    <div className="bg-overlay border border-divider rounded-lg shadow-2xl w-72 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-2 pt-2">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji…"
          className="w-full bg-input-bg text-text-primary text-xs rounded px-2 py-1.5 outline-none placeholder:text-text-muted"
        />
      </div>

      {/* Category tabs */}
      {!search.trim() && (
        <div className="flex gap-0.5 px-2 pt-2 pb-1">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveCat(i)}
              title={cat.label}
              className={`flex-1 text-center py-1 rounded text-base transition-colors ${
                i === activeCat ? "bg-accent/20" : "hover:bg-msg-hover"
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Category label */}
      {!search.trim() && (
        <p className="text-text-muted text-xs font-semibold uppercase tracking-wide px-3 pb-1">
          {CATEGORIES[activeCat].label}
        </p>
      )}

      {/* Emoji grid */}
      <div className="overflow-y-auto max-h-48 px-2 pb-2">
        <div className="grid grid-cols-8 gap-0.5">
          {emojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => onPick(emoji)}
              className="w-8 h-8 flex items-center justify-center text-xl rounded hover:bg-msg-hover transition-colors"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Server-only — rendered inside an API route, never imported by client components.
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// Use built-in Helvetica so no font files are needed
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 16,
  },
  listName: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 6,
  },
  description: {
    fontSize: 11,
    color: "#6b7280",
    lineHeight: 1.5,
    marginBottom: 10,
  },
  meta: {
    fontSize: 9,
    color: "#9ca3af",
  },

  // ── Item rows ────────────────────────────────────────────────────────────
  itemsSection: {
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: "#f3f4f6",
    objectFit: "cover",
    flexShrink: 0,
  },
  artPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 4,
    backgroundColor: "#f3f4f6",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  artPlaceholderText: {
    fontSize: 18,
    color: "#d1d5db",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginBottom: 2,
  },
  artist: {
    fontSize: 10,
    color: "#6b7280",
  },
  album: {
    fontSize: 9,
    color: "#9ca3af",
    marginTop: 1,
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 3,
    flexShrink: 0,
  },
  year: {
    fontSize: 10,
    color: "#6b7280",
  },
  typeBadge: {
    fontSize: 8,
    color: "#9ca3af",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#d1d5db",
  },
  footerBrand: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#d1d5db",
  },
});

interface Item {
  id: string;
  type: "SONG" | "ALBUM";
  title: string;
  artistName: string;
  albumName: string | null;
  releaseYear: number | null;
  coverArtUrl: string | null;
}

interface ListData {
  name: string;
  description: string | null;
  createdAt: string;
  items: Item[];
}

export function ListPDF({ list }: { list: ListData }) {
  const created = new Date(list.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document title={list.name} author="musicislyfe">
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.listName}>{list.name}</Text>
          {list.description && (
            <Text style={styles.description}>{list.description}</Text>
          )}
          <Text style={styles.meta}>
            {list.items.length} {list.items.length === 1 ? "item" : "items"} · {created}
          </Text>
        </View>

        {/* Items */}
        <View style={styles.itemsSection}>
          {list.items.map((item) => (
            <View key={item.id} style={styles.row} wrap={false}>
              {/* Cover art */}
              {item.coverArtUrl ? (
                <Image src={item.coverArtUrl} style={styles.art} />
              ) : (
                <View style={styles.artPlaceholder}>
                  <Text style={styles.artPlaceholderText}>
                    {item.type === "SONG" ? "♪" : "◉"}
                  </Text>
                </View>
              )}

              {/* Info */}
              <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.artist}>{item.artistName}</Text>
                {item.albumName && item.type === "SONG" && (
                  <Text style={styles.album}>{item.albumName}</Text>
                )}
              </View>

              {/* Year + type */}
              <View style={styles.rightCol}>
                {item.releaseYear && (
                  <Text style={styles.year}>{item.releaseYear}</Text>
                )}
                <Text style={styles.typeBadge}>
                  {item.type === "SONG" ? "Song" : "Album"}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>List hosted on musicislyfe</Text>
          <Text style={styles.footerBrand}>musicislyfe</Text>
        </View>
      </Page>
    </Document>
  );
}

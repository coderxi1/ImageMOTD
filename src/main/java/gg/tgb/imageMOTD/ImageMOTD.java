package gg.tgb.imageMOTD;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.ShadowColor;
import net.kyori.adventure.text.object.ObjectContents;
import net.kyori.adventure.text.object.PlayerHeadObjectContents;
import net.kyori.adventure.text.serializer.gson.GsonComponentSerializer;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.logging.Level;

public final class ImageMOTD extends JavaPlugin {
    private static final int MAX_MOTD_JSON_CHARS = 32000;
    private static final int HEADS_PER_ROW = 33;
    private static final int ROW_COUNT = 2;

    @Override
    public void onEnable() {
        saveDefaultConfig();

        String imageFileTxt = getConfig().getString("image-motd.image-file");
        if (imageFileTxt == null || imageFileTxt.isBlank()) {
            getLogger().severe("Missing config value: image-motd.image-file");
            return;
        }

        Path imageFilePath = getDataFolder().toPath().resolve("images").resolve(imageFileTxt);
        List<String> textureSources = loadTextureSources(imageFilePath);

        List<String> unsignedTextureValues = textureSources.stream()
                .map(this::toUnsignedTextureValue)
                .toList();

        Component motd = buildUnsignedHeadMotd(unsignedTextureValues)
            .color(NamedTextColor.WHITE)
            .shadowColor(ShadowColor.shadowColor(0xFFFFFFFF));
        getServer().motd(motd);
    }

    private List<String> loadTextureSources(Path imageFilePath) {
        if (!Files.exists(imageFilePath)) {
            getLogger().severe("Texture source file not found: " + imageFilePath);
            return List.of();
        }

        try {
            return Files.readAllLines(imageFilePath, StandardCharsets.UTF_8).stream()
                    .map(String::trim)
                    .filter(line -> !line.isEmpty())
                    .toList();
        } catch (IOException ex) {
            getLogger().log(Level.SEVERE, "Failed to read texture source file: " + imageFilePath, ex);
            return List.of();
        }
    }

    private String toUnsignedTextureValue(String textureSource) {
        String json = "{\"textures\":{\"SKIN\":{\"url\":\"" + textureSource + "\"}}}";
        return Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private Component buildUnsignedHeadMotd(List<String> unsignedTextureValues) {
        if (unsignedTextureValues.isEmpty()) {
            return Component.text("No head, breaks skateboard");
        }

        Component motd = Component.empty();
        int addedHeads = 0;

        for (int row = 0; row < ROW_COUNT; row++) {
            if (row > 0) {
                Component withNewline = motd.appendNewline();
                if (GsonComponentSerializer.gson().serialize(withNewline).length() > MAX_MOTD_JSON_CHARS) {
                    getLogger().warning("Hit head limit at " + (row + 1) + " rows.");
                    break;
                }
                motd = withNewline;
            }

            for (int col = 0; col < HEADS_PER_ROW; col++) {
                String textureValue = unsignedTextureValues.get(addedHeads % unsignedTextureValues.size());
                Component head = Component.object(
                        ObjectContents.playerHead()
                                .profileProperty(PlayerHeadObjectContents.property("textures", textureValue))
                                .hat(true)
                                .build()
                );

                Component candidate = motd.append(head);
                if (GsonComponentSerializer.gson().serialize(candidate).length() > MAX_MOTD_JSON_CHARS) {
                    getLogger().warning("Hit head limit at " + addedHeads + " heads.");
                    row = ROW_COUNT;
                    break;
                }

                motd = candidate;
                addedHeads++;
            }
        }

        int finalLength = GsonComponentSerializer.gson().serialize(motd).length();
        getLogger().info("heads=" + addedHeads + ", JSON length=" + finalLength);

        return motd;
    }

    @Override
    public void onDisable() {
        // Plugin shutdown logic
    }
}

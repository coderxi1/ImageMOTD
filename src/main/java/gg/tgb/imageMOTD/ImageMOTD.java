package gg.tgb.imageMOTD;

import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import net.kyori.adventure.text.format.ShadowColor;
import net.kyori.adventure.text.object.ObjectContents;
import net.kyori.adventure.text.object.PlayerHeadObjectContents;
import net.kyori.adventure.text.serializer.gson.GsonComponentSerializer;
import org.bukkit.plugin.java.JavaPlugin;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

public final class ImageMOTD extends JavaPlugin {
    private static final int MAX_MOTD_JSON_CHARS = 32000;
    private static final int HEADS_PER_ROW = 33;
    private static final int ROW_COUNT = 2;

    @Override
    public void onEnable() {
        List<String> textureSources = List.of(
                "https://textures.minecraft.net/texture/5005c0726d35625c8470517704dfc76ea0c3eca76b50c7309d7692bbfaf9844b",
                "https://textures.minecraft.net/texture/2f848542c9de72737fe85d778e4d2fd8bc5bfc33dac772d13eef541e1dbe72d4",
                "https://textures.minecraft.net/texture/d3de56acc9f3d5e38450933c9d8b64a9343658961fcf8a653dd337428dbf641e",
                "https://textures.minecraft.net/texture/8ae25af35c8ef9692c68072935105fa17b9ab16029fdbc3510487a8f4e679468",
                "https://textures.minecraft.net/texture/d41f2984f8d125403bf76701047663599296435f872974917cf2d50c6a40bf86",
                "https://textures.minecraft.net/texture/6bc2ccab7d9dad23f6e3836387e2d6e040d1b53326f39561d7b6c6f67cb2853d",
                "https://textures.minecraft.net/texture/63215a4d0283f2f114cb99bc7779128f381e1e70f55f3b6252ec56cbef4d1de3",
                "https://textures.minecraft.net/texture/7f07c1f08b32879df69e8c1a6d58997fc002593abca925119a05c1eaaa07449d",
                "https://textures.minecraft.net/texture/e1a17f43deeaac48f232b44cf63637e7a524c4e1ea5b1d7009b3b22661a8bc23",
                "https://textures.minecraft.net/texture/440588d6b13f305a7b817e88d5fa1b7bde0c228cd6b01c42a5ceeb0ca7ad5a2f",
                "https://textures.minecraft.net/texture/1c78ce01234e903ad4c5f65147de7c0940cc002bf828727be73c64df77937484",
                "https://textures.minecraft.net/texture/367f600f7b7cb489387c65e9059a0ad2c2f47743653f40e81c20913907733c1c",
                "https://textures.minecraft.net/texture/5024028a71c28b075e89d86fad3f1e431f4db6e6a7949b1de9811e09ab15adde",
                "https://textures.minecraft.net/texture/e3ba3236ebeaaacb04523e9f93b1a619456c3b9a3741428d3353ca6a518ad897",
                "https://textures.minecraft.net/texture/a74fb12ea2623eae5c103ca98fb7971e49109e2d89ba729f4fd58edb934d84f",
                "https://textures.minecraft.net/texture/5c98118367675f5cc09357eba96fc9eadb3222b2d6571098e6d57efd4b2098f8",
                "https://textures.minecraft.net/texture/16243350aa79062dd66426fc19c0d2a53e806f69fa3a5dfd49b03a28ba0c9086",
                "https://textures.minecraft.net/texture/c256fe9a16bcf34de393f6fc3c1e60b93f65791d5fba1d25bd351de0e52e3e88",
                "https://textures.minecraft.net/texture/353d3d0b51013715fcff538422d38394f477fd28cfb32d777fe3029c144410c",
                "https://textures.minecraft.net/texture/3b09a8b7492bede91703f985f65af0c37e0754c80df74322ad7cd39b17f2b357",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/8b2b010c234bca0b785ff461d594640f46420f5bc9433b6885f66b45ca523849",
                "https://textures.minecraft.net/texture/25d955cb680e5db25ee873d080c9d1d2b2b08a013167713ca4245317923e262d",
                "https://textures.minecraft.net/texture/3dff13b5509da812062d2b4aa69e258ea72d8d46629a5422084cb0a038a5c70f",
                "https://textures.minecraft.net/texture/35bad984342ff8f2bf8e833033405ac2a1d6010b951222078221358aef9db7f2",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/d458bd014316ebb546b5ac778f4add1ef76a33275c1ac2c7b089749e264ab552",
                "https://textures.minecraft.net/texture/3f4dd9d30125007cf6a115f06a98be030e813888459c579d7282d5158d68d933",
                "https://textures.minecraft.net/texture/c90844ee744d37846aacde60f3e9d09439186bea9ff351017656421bf42691e0",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/efb822998eb0d9ad563590a6a3794767e17afdcaa3cb208aebc33f26c4907b2a",
                "https://textures.minecraft.net/texture/becc8a688c52acfd68b452175eaae93a78f82eaa26bd4608a09b233184ed7557",
                "https://textures.minecraft.net/texture/435113bbc2079b094e82c0b0e982a7151b80bfe3ce9749e44930100dd9b2b8e",
                "https://textures.minecraft.net/texture/4515d2a710888114172c0b420e1f34cd5b48df564c177b25b295272f3d3619ab",
                "https://textures.minecraft.net/texture/ce38dee6c99fa1d07f9e8430970f99c627a268a5fa01eb77ebd0a5db2b66a087",
                "https://textures.minecraft.net/texture/7d4eacd2f136d79197bbefaae8e5760692fa7ca6545182ae457de60caed2983e",
                "https://textures.minecraft.net/texture/909b72a789466c0d519b6db58274bab61e9bcfe97aa6c9018242d27a9647b979",
                "https://textures.minecraft.net/texture/b6b524060cf6c3afd97c6442ab4b0706f15f479a2afd7d364a74620f43c9edb8",
                "https://textures.minecraft.net/texture/fe579b10d2fa27e425d304f6eafff1e0302b3e6567d60c2cdfa4e3c0846ff055",
                "https://textures.minecraft.net/texture/e445f21572b45b9be042cdd20c42d52e419fe6f92a3b0e5bc10c58dfe1ffb46a",
                "https://textures.minecraft.net/texture/ecdc2dc9289b7ceb6bde4fcf506ae38aab973bd0fe1aaf905530d68fed54da76",
                "https://textures.minecraft.net/texture/d904d6b0bec5d362fac8d993dd4ec2e8b5b32fcfc92b01799dba0a8daecbfe91",
                "https://textures.minecraft.net/texture/86d2f8ad9b1ddaaf5cd178a878c4a54c77edb273cd7d9b11497f9910e01c3ec3",
                "https://textures.minecraft.net/texture/97f33f3d0d2ac7bcd80c872a989744db97bc93faba8cb77ead58f588d50ec4de",
                "https://textures.minecraft.net/texture/d27c61e0e4ed0564fd614a2a16a810328347e439359e321d08e0b6001db271fa",
                "https://textures.minecraft.net/texture/cf7179a217c10d7459615cf8cad6f42f0f082332b64cf586d526c0bbf8436e44",
                "https://textures.minecraft.net/texture/7b2d767dd570275cf5c78c25792be4db396694e14927d56ce0415d2e07c70e55",
                "https://textures.minecraft.net/texture/82807ba11994abb27188b5a4ce93d4fb4470a35be26ead13d75b0d974ea37b83",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/ff5cc3012cae01b06645e779161706eb56ac23d2eb4c32dacc7af1b42054904b",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/970fdd91eff7d17f68385ad2b5e11960a97004574b4247c0d694519a44264d1e",
                "https://textures.minecraft.net/texture/f6a1317eb37f9d9ba24ac4c0c963cdf20d0d634955fd51ade1bd17112b155b99",
                "https://textures.minecraft.net/texture/c62a7f3a699e23b229e0d99e42d906a1868c08a0b6f346e9147a58f0152fd04d",
                "https://textures.minecraft.net/texture/46587cef9cf6bd1a453a6c6af165e938fc8ac8bc0f433355c2a6fc7b16f74b03",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/9572813b0e78ae13c649551d9a1d1e9bf548d2c1684b5b9deeb849d2e329ce2c",
                "https://textures.minecraft.net/texture/3992cc186b90603fa1af0b44062fbe3b4c9a09023bca7e7df59c2a00a912af79",
                "https://textures.minecraft.net/texture/4f901928f2288b95121e8f62c0c9d93c79b8ad8c0fff3b35ec56affec9429ec8",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736",
                "https://textures.minecraft.net/texture/5fbe2dd4617873f2d303a95645b8a11a7a4da96aad8b6e92be9b3bdd55bf0736"
                );
        List<String> unsignedTextureValues = textureSources.stream()
                .map(this::toUnsignedTextureValue)
                .toList();

        Component motd = buildUnsignedHeadMotd(unsignedTextureValues)
            .color(NamedTextColor.WHITE)
            .shadowColor(ShadowColor.shadowColor(0xFFFFFFFF));
        getServer().motd(motd);
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

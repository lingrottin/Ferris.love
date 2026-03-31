import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  type BadgeOptions,
  cssElement,
  ferris,
  InterBold,
  withClassName,
  withSvgRoot,
} from "./index";

const css = `
@media(prefers-color-scheme:light){
.left-bg {fill:#FFFFFF;}
.left-fg {fill:#000000;}
}
@media(prefers-color-scheme:dark){
.left-bg {fill:#222222;}
.left-fg {fill:#FFFFFF;}
}
.right-bg{fill:#F74C00;}
.right-fg{fill:#FFFFFF;}
`;

export default async function MiniBadge(options: BadgeOptions) {
  const env = getCloudflareContext().env;
  const { lorc } = options;
  const font = await InterBold(env);
  let svg = cssElement(css);

  svg += `<path d="M0 3C0 1 1 0 3 0H95V20H3C1 20 0 19 0 17V3Z" class="left-bg"/>`;
  svg += withClassName(
    font.getPath("Rust lines", 30, 15, 12).toSVG(2),
    "left-fg",
  );
  const w = font.getAdvanceWidth(lorc.toLocaleString(), 12) + 92 + 12;

  svg += `<path class="right-bg" d="M92 0H${w - 3}C${w - 1} 0 ${w} 1 ${w} 3V17C${w} 19 ${w - 1} 20 ${w - 3} 20H92V0Z"/>`;
  svg += withClassName(
    font.getPath(lorc.toLocaleString(), 98, 15, 12).toSVG(2),
    "right-fg",
  );
  svg += ferris(5, 3, 14, 20);
  return withSvgRoot(svg, 155, 20, "a");
}

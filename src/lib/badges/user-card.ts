import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  type BadgeOptions,
  cssElement,
  ferris,
  InterBlack,
  InterBold,
  InterRegular,
  withClassName,
  withSvgRoot,
} from "./index";

const css = `
@media (prefers-color-scheme: dark) {
  #bg {fill:#222222;}
  .fg {fill:#FFFFFF;}
}
@media (prefers-color-scheme: light) {
  #bg {fill:#F6F8FA;}
  .fg {fill:#000000;}
}
.accent {fill:#F74C00;}
`;
export async function UserCard(options: BadgeOptions) {
  const env = getCloudflareContext().env;
  const { lorc, name } = options;
  const interRegular = await InterRegular(env);
  const interBold = await InterBold(env);
  const interBlack = await InterBlack(env);

  let svg = "";

  const username_w = interBold.getAdvanceWidth(name, 22);
  svg += withClassName(interBold.getPath(name, 20, 42, 22).toSVG(1), "fg");
  const has_written_w = interRegular.getAdvanceWidth(" has written", 22);
  svg += withClassName(
    interRegular.getPath(" has written", 20 + username_w, 42, 22).toSVG(1),
    "fg",
  );
  svg += withClassName(
    interBlack.getPath(lorc.toLocaleString(), 20, 85, 40).toSVG(1),
    "accent",
  );
  const lorcand_w = interRegular.getAdvanceWidth(
    "lines of Rust code, and ",
    18,
  );
  svg += withClassName(
    interRegular.getPath("lines of Rust code, and ", 20, 110, 18).toSVG(1),
    "fg",
  );
  svg += withClassName(
    interBold.getPath("loves Ferris.", 20 + lorcand_w, 110, 18).toSVG(1),
    "accent",
  );
  const bottom_w =
    interRegular.getAdvanceWidth("lines of Rust code, and ", 18) +
    interBold.getAdvanceWidth("loves Ferris.", 18);
  svg += ferris(15 + username_w + has_written_w, 35, 55, 80);
  const final_width = Math.max(
    bottom_w + 40,
    username_w + has_written_w + 75 + 40,
  );
  svg = `${cssElement(css)}
<rect width="${final_width}" height="130" rx="20" id="bg"/>
${svg}`;
  return withSvgRoot(svg, final_width, 130, `${name}'s Rust code stats`);
}

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  type BadgeOptions,
  cssElement,
  ferris,
  formatNumber,
  InterBold,
  InterRegular,
  withClassName,
  withSvgRoot,
} from "./index";

const css = `
@media (prefers-color-scheme: dark) {
  #left-block-bg {fill:#7B2600;}
  #right-block-bg {fill:#222222;}
  .fg {fill:#FFFFFF;}
}
@media (prefers-color-scheme: light) {
  #left-block-bg {fill:#F74C00;}
  #right-block-bg {fill:#F6F8FA;}
  .fg {fill:#000000;}
}
.accent {fill:#F74C00;}
.left-fg {fill:#FFFFFF;}
`;

export default async function RepoHorizontalBadge(options: BadgeOptions) {
  const env = getCloudflareContext().env;
  const { metrics, lorc, name: repoName } = options;

  const interRegular = await InterRegular(env);
  const interBold = await InterBold(env);

  let svg = cssElement(css);

  const height = 120;

  // --------------- left block -------------------

  // orange background on the left
  svg += `<path id="left-block-bg" d="M0 20C0 9 9 0 20 0H160V120H20C9 120 0 111 0 100V20Z"/>`;
  const total_w = interBold.getAdvanceWidth("Total", 15);
  const lorc_w = interRegular.getAdvanceWidth("Lines of Rust code", 13);
  const lorc_num_w = interBold.getAdvanceWidth(lorc.toLocaleString(), 30);
  svg += withClassName(
    interBold.getPath("Total", (160 - total_w) / 2, 33, 15).toSVG(1),
    "left-fg",
  );
  svg += withClassName(
    interBold
      .getPath(lorc.toLocaleString(), (160 - lorc_num_w) / 2, 75, 30)
      .toSVG(1),
    "left-fg",
  );
  svg += withClassName(
    interBold
      .getPath("Lines of Rust code", (160 - lorc_w) / 2, 98, 13)
      .toSVG(1),
    "left-fg",
  );

  // --------------- Right block ------------------
  let r_top_layer_svg = "";
  const hero_before_w = interRegular.getAdvanceWidth(
    "Rust code statistics of ",
    18,
  );
  const hero_after_w = interBold.getAdvanceWidth(repoName, 18);
  const enableHeroBefore = metrics.length * 75 > hero_before_w;
  let cur_x = 160;
  for (const met of metrics) {
    const value_w = interBold.getAdvanceWidth(formatNumber(met.value), 30);
    const label_w = interRegular.getAdvanceWidth(met.label, 13);
    r_top_layer_svg += withClassName(
      interBold
        .getPath(formatNumber(met.value), cur_x + (100 - value_w) / 2, 75, 30)
        .toSVG(1),
      "accent",
    );
    r_top_layer_svg += withClassName(
      interRegular
        .getPath(met.label, cur_x + (100 - label_w) / 2, 98, 13)
        .toSVG(1),
      "fg",
    );
    cur_x += 100;
  }
  cur_x = 180;
  if (enableHeroBefore) {
    cur_x += hero_before_w;
    r_top_layer_svg += withClassName(
      interRegular.getPath("Rust code statistics of ", 180, 33, 18).toSVG(1),
      "fg",
    );
  }
  r_top_layer_svg += withClassName(
    interBold.getPath(repoName, cur_x, 33, 18).toSVG(1),
    "accent",
  );

  const r_block_final_width = Math.max(
    enableHeroBefore ? hero_after_w + hero_before_w : hero_after_w,
    metrics.length * 100,
  );
  r_top_layer_svg += ferris(160 + r_block_final_width + 10, 20, 80, 100);
  svg += `
<path id="right-block-bg" d="M160 0H${280 + r_block_final_width - 20}C${280 + r_block_final_width - 11} 0 ${280 + r_block_final_width} 9 ${280 + r_block_final_width} 20
V100C${280 + r_block_final_width} 111 ${280 + r_block_final_width - 9} 120 ${280 + r_block_final_width - 20} 120H160V0Z"/>
`;
  svg += r_top_layer_svg;
  return withSvgRoot(
    svg,
    280 + r_block_final_width,
    height,
    `Rust code statistics of ${repoName}`,
  );
}

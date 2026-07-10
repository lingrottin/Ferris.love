import { AdwaitaMonoBold, InterBold, InterRegular } from "./font";
import {
  type BadgeOptions,
  cssElement,
  svgNum,
  withClassName,
  withSvgRoot,
} from "./index";

const css = `
@media(prefers-color-scheme:light){
.fg {fill:#000000;}
.name {fill:#000000;}
.upper-bg {fill:#F6F8FA;}
.bottom-bg {fill:#F74C00;}
}
@media(prefers-color-scheme:dark){
.fg {fill:#FFFFFF;}
.name {fill:#F74C00;}
.upper-bg {fill:#222222;}
.bottom-bg{fill:#7B2600;}
}
.number {fill:#F74C00;}
.bottom-fg{fill:#FFFFFF;}
`;

export async function RepoMixedBadge(options: BadgeOptions) {
  const { metrics, lorc, name: repoName } = options;
  const interRegular = await InterRegular();
  const interBold = await InterBold();
  const adwaitaMono = await AdwaitaMonoBold();
  let svg = cssElement(css);

  // --------------- upper block -----------------
  const rn_w = interBold.getAdvanceWidth(repoName, 18);
  const has_w = interRegular.getAdvanceWidth(" has...", 18);
  let upper_block_title = "";

  upper_block_title += withClassName(
    interBold.getPath(repoName, 20, 38, 18).toSVG(1),
    "name",
  );
  upper_block_title += withClassName(
    interRegular.getPath(" has...", 20 + rn_w, 38, 18).toSVG(1),
    "fg",
  );

  // -------- upper block - left half - calculations ----
  const lorc_w = interBold.getAdvanceWidth(lorc.toLocaleString(), 30);
  const lorc_desc_w = interBold.getAdvanceWidth("Lines of Rust code", 16);
  let line1 = "Lines of Rust code";
  let line2 = "";
  let left_half_w = 0;
  let desc_bigger_w = lorc_desc_w;
  if (lorc_w <= lorc_desc_w) {
    // 2 lines
    line1 = "Lines of";
    line2 = "Rust code";
    const lo_w = interBold.getAdvanceWidth("Lines of", 16);
    if (lo_w > lorc_w) {
      desc_bigger_w = interBold.getAdvanceWidth("Rust code", 16);
    } else {
      line1 += " Rust";
      line2 = "code";
      desc_bigger_w = interBold.getAdvanceWidth("Lines of Rust", 16);
    }
  }
  left_half_w = Math.max(lorc_w, desc_bigger_w);
  const left_half_h = 30 + 23 + +!!line2 * 19;

  // ------------- upper block - right half - calculations -----
  const right_half_h = metrics.length * 18;
  const upper_data_h = Math.max(right_half_h, left_half_h);
  const code_num_widths = [];
  const label_widths = [];
  for (const met of metrics) {
    code_num_widths.push(
      adwaitaMono.getAdvanceWidth(met.value.toLocaleString(), 14),
    );
    label_widths.push(interRegular.getAdvanceWidth(met.label, 14));
  }
  const max_code_num_w = Math.max(...code_num_widths);
  const max_label_w = Math.max(...label_widths);
  const right_half_w = max_code_num_w + max_label_w;
  const upper_data_w =
    left_half_w +
    right_half_w +
    40 + // 分割线左右
    40; // 卡片左右

  // ---------- upper block - insertions --------------------

  const upper_block_w = Math.max(upper_data_w, rn_w + has_w + 40 + 40);

  const upper_block_h =
    upper_data_h +
    20 + // 卡片顶部
    18 + // 标题字号
    10 + // 标题与内容间的空隙
    15; // 内容与下面间的空隙

  svg += `<path d="M0 20C0 10 10 0 20 0H${upper_block_w - 20}C${upper_block_w - 10} 0 ${upper_block_w} 10 ${upper_block_w} 20V${upper_block_h}H0V20Z" class="upper-bg"/>`;
  svg += upper_block_title;
  const upper_y_origin = 48;

  const upper_left_y_origin = upper_y_origin + (upper_data_h - left_half_h) / 2;
  svg += withClassName(
    interBold
      .getPath(lorc.toLocaleString(), 20, upper_left_y_origin + 30, 30)
      .toSVG(1),
    "number",
  );
  svg += withClassName(
    interBold.getPath(line1, 20, upper_left_y_origin + 30 + 23, 16).toSVG(1),
    "fg",
  );
  if (line2)
    svg += withClassName(
      interBold
        .getPath(line2, 20, upper_left_y_origin + 30 + 23 + 19, 16)
        .toSVG(1),
      "fg",
    );

  const desired_divider_x =
    upper_block_w - 20 - Math.max(right_half_w, (upper_block_w - 40) / 2);

  const upper_right_x_origin =
    right_half_w > (upper_block_w - 40) / 2
      ? desired_divider_x + 15
      : upper_block_w - 40 - right_half_w;
  const upper_right_y_origin =
    upper_y_origin + (upper_data_h - right_half_h) / 2;

  const actual_divider_x = (20 + left_half_w + upper_right_x_origin) / 2;
  // y 坐标 +6: 不知道为什么，文字似乎天然会偏下一点，这样看起来更平衡

  svg += svgNum`<path d="M${actual_divider_x} ${6 + upper_y_origin}V${6 + upper_y_origin + upper_data_h}Z" stroke-width="1" stroke="#F74C00"/>`;

  metrics.forEach((mat, i) => {
    svg += withClassName(
      adwaitaMono
        .getPath(
          mat.value.toLocaleString(),
          upper_right_x_origin,
          upper_right_y_origin + (i + 1) * 18,
          14,
        )
        .toSVG(1),
      "number",
    );

    svg += withClassName(
      interRegular
        .getPath(
          mat.label,
          upper_right_x_origin + max_code_num_w + 15,
          upper_right_y_origin + (i + 1) * 18,
          14,
        )
        .toSVG(1),
      "fg",
    );
  });

  // ------------ downer block ---------------
  const downer_y_origin = upper_block_h;

  svg += svgNum`<path class="bottom-bg" d="M0 ${downer_y_origin}H${upper_block_w}V${downer_y_origin + 15}C${upper_block_w} ${downer_y_origin + 25} ${upper_block_w - 10} ${downer_y_origin + 35} ${upper_block_w - 20} ${downer_y_origin + 35}H20C10 ${downer_y_origin + 35} 0 ${downer_y_origin + 25} 0 ${downer_y_origin + 15}V${downer_y_origin}Z"/>`;

  svg += withClassName(
    interBold
      .getPath("...and loves Ferris.", 20, downer_y_origin + 22, 16)
      .toSVG(1),
    "bottom-fg",
  );

  svg += ferrisHeart(upper_block_w - 77, downer_y_origin + 3.5, 28, 57);
  return withSvgRoot(
    svg,
    upper_block_w,
    upper_block_h + 35,
    `Rust code statistics of ${repoName}`,
  );
}

function ferrisHeart(x: number, y: number, height: number, width: number) {
  return `
<svg viewBox="0 0 65 32" width="${width}" height="${height}" x="${x}" y="${y}" fill="none">
  <path fill="#fff" d="m31.9 29-.1.1a1.5 1.5 0 0 1-2.5.6L23.4 24a3.6 3.6 0 0 1 0-5.3l.9-.8c.8-.7 1-2 .4-2.8a2.3 2.3 0 0 1 1.1-3.4l1.4-.5A3 3 0 0 0 29 8.5v-.1c-.2-1.7 1.3-3.1 3-2.8q2.1.2 3-1.7v-.1A2.8 2.8 0 0 1 39 2.4h.1q2 1 3.6-.4c1-1.1 2.8-1.2 3.9-.1l.9.8a3 3 0 0 0 2.5.8l1-.2a2 2 0 0 1 2.3 1.8 2 2 0 0 0 2 1.9h.2C57 7 58 8.2 57.8 9.5q0 1.7 1.5 2.4 1.8.9 1.6 2.7l-.2.6a3 3 0 0 0 1.4 3.3h.1c1.5 1 2 3 1 4.6l-4 6.3a1.8 1.8 0 0 1-3 0l-.4-.8a3 3 0 0 0-4-1L48 30.2q-1.7 1.1-3.4 0h-.2a3 3 0 0 0-3.4.2 3 3 0 0 1-3.5 0l-3-2.1c-1-.6-2.2-.3-2.6.8"/>
  <path fill="#f74c00" d="m61.2 19.5-1.8-1.3q-.7-.6-.3-1.6l.4-1.1a2 2 0 0 0-1.4-2.4l-1.4-.2-.4-.3.2-2.3a1.8 1.8 0 0 0-2-2l-1.6.2-.5-.5-.3-1.5A1.8 1.8 0 0 0 49.7 5l-1.9.7-.4-.2L46 3.7a2 2 0 0 0-2.5-.3l-2 1.5h-.5l-2-1.1a2 2 0 0 0-2.5.7L35 6.8l-.4.3-2.4-.3a2 2 0 0 0-2 1.6l-.3 2.9-.2.4-2.6 1a2 2 0 0 0-1 2.2l.6 2.6-2.2 2.5q-1 1.2-.2 2.4s6 6.1 6 6.4c.2-1.1-3.9-7-3.7-7.4q.4-.7.5-.6s3.8 5.6 4 5.6c.2-.5-1.8-4.6-2-5l1.3.5c2.7 4.2 4.6 4.2 4.6 4.2 4.7 6.3 7 1.3 7 1.3q-2.7-.4-4.6-2.2 4.9-.5 5-.4c-4.3-5.9-7.7-.6-7.7-.6q-1-.6-1.7-1.6l2.5.4c1.2-1.2 3.6-2.5 6.3.4h2.2c2.8-3.3 5-1.8 6.1-.5l3.5-.6-2 1.5-1 .3s-3-5.8-7.2.7c0 0 1.3-.8 4.9.2a6 6 0 0 1-5 2.5s3.2 4 8-1.7c0 0 3.5-1.4 5-4.4q.8-.2 1.3-.6c.1.2-2.3 5.4-2 5.8.3-.8 3.4-5.3 3.5-5.7l.3.3c.2 1-2.7 7-2.4 7.7 1-.8 4.9-7.4 4.9-7.4q.5-1.1-.8-2"/>
  <path fill="#231815" d="M45.6 16.3s1.5-1.7 3 0c0 0 1.2 2.3 0 3.5 0 0-1.9 1.6-3 0 0 0-1.2-1.3 0-3.5"/>
  <path fill="#fff" d="M47.4 17q0 1-.9 1.2-.7-.2-.8-1.2.1-1.1.8-1.2t.9 1.2"/>
  <path fill="#231815" d="M39 15.9s2.5-1.2 3.2 1.4c0 0 .8 3.1-2.1 3.3 0 0-3.6-.7-1.2-4.7"/>
  <path fill="#fff" d="M40.2 17q-.1 1.2-.8 1.3-.9-.1-1-1.3.1-1.1 1-1.2.7 0 .8 1.2M7.9 22.2l-6.6-6.6q-.8-.7-1-1.8-.3-1 0-2 .2-1.2 1-1.9A4 4 0 0 1 7 10l.9.9.8-.9a4 4 0 0 1 5.7 5.7z"/>
</svg>
`;
}

# 字体文件说明 / Font Files

## 必需字体 / Required Fonts

PDF导出功能需要以下 **ARUDJingxihei (阿如汉字黑体)** 字体文件：

Please place the following **ARUDJingxihei** font files in this directory:

```
public/fonts/
├── ARUDJingxihei-Regular.ttf  (必需 / Required) - 正常字重，约 3-6 MB
├── ARUDJingxihei-Bold.ttf     (必需 / Required) - 粗体字重，约 3-6 MB
└── ARUDJingxihei-Light.ttf    (必需 / Required) - 细体字重，约 3-6 MB
```

## 字体用途 / Font Usage

- **Regular**: 正文、普通文本 / Body text, normal text
- **Bold**: 标题、粗体强调 / Headings, bold emphasis
- **Light**: 斜体替代、细体文本 / Italic fallback, light text

## 字体来源 / Font Source

ARUDJingxihei (阿如汉字黑体) 是一款开源中文字体，支持简繁日韩汉字。

ARUDJingxihei is an open-source Chinese font supporting Simplified/Traditional Chinese, Japanese and Korean characters.

## 验证 / Validation

启动应用后，PDF导出时会自动验证字体文件：
- ✅ TTF 格式魔数验证
- ✅ 文件大小检查（应 > 500 KB）
- ✅ Unicode cmap 表检查
- ✅ Content-Type 验证

如果字体文件缺失或无效，系统会自动降级到 helvetica 默认字体（中文可能显示为方块）。

If fonts are missing or invalid, the system will automatically fallback to helvetica (Chinese characters may display as boxes).

## 注意事项 / Notes

⚠️ **请勿使用其他字体文件名！** 代码已配置为加载上述特定文件名。

⚠️ **Do NOT use different font filenames!** The code is configured to load the specific filenames above.

⚠️ **文件大小**: 正常的中文字体文件应至少 3-6 MB。如果文件过小（< 500 KB），可能是损坏的或不完整的字体。

⚠️ **File Size**: Normal Chinese font files should be at least 3-6 MB. Files smaller than 500 KB may be corrupted or incomplete.

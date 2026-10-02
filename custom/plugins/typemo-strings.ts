import { definePlugin } from "@consify/core/plugins";

/*
 * The words the custom components show by themselves (a Callout title, "Parameters", "required", …), in every
 * language of the site. A component reads them with `useMessages<TypemoMessages>()`, which picks the language of
 * the page; English is the fallback of consify for a language without its own strings.
 */
const en = {
  "typemo.callout.tip": "Tip",
  "typemo.callout.note": "Note",
  "typemo.callout.warning": "Warning",
  "typemo.callout.error": "Error",
  "typemo.callout.success": "Done",
  "typemo.callout.migration": "Coming from Mongoose",
  "typemo.fullType": "Full type",
  "typemo.params": "Parameters",
  "typemo.returns": "Returns",
  "typemo.param.required": "required",
  "typemo.param.default": "default:",
  "typemo.term.more": "Learn more",
  "typemo.valueForms.type": "Type",
  "typemo.valueForms.hydrated": "Document",
};

export type TypemoMessages = typeof en;

const ru: TypemoMessages = {
  "typemo.callout.tip": "Подсказка",
  "typemo.callout.note": "Заметка",
  "typemo.callout.warning": "Внимание",
  "typemo.callout.error": "Ошибка",
  "typemo.callout.success": "Готово",
  "typemo.callout.migration": "Если вы пришли из Mongoose",
  "typemo.fullType": "Полный тип",
  "typemo.params": "Принимает",
  "typemo.returns": "Возвращает",
  "typemo.param.required": "обязательный",
  "typemo.param.default": "по умолчанию:",
  "typemo.term.more": "Подробнее",
  "typemo.valueForms.type": "Тип",
  "typemo.valueForms.hydrated": "Документ",
};

export const typemoStrings = definePlugin({ name: "typemo-strings", messages: { en, ru } });

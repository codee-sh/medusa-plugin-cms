import formFieldsEn from "../components/manager-form-fields/i18n/json/en.json"
import formFieldsPl from "../components/manager-form-fields/i18n/json/pl.json"
import {
  CMS_I18N_NS,
  MANAGER_FORM_FIELDS_I18N_NS,
} from "../../shared/admin-i18n-ns"
import en from "./json/en.json"
import pl from "./json/pl.json"

export default {
  en: {
    [CMS_I18N_NS]: en,
    [MANAGER_FORM_FIELDS_I18N_NS]: formFieldsEn,
  },
  pl: {
    [CMS_I18N_NS]: pl,
    [MANAGER_FORM_FIELDS_I18N_NS]: formFieldsPl,
  },
}

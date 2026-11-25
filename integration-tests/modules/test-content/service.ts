import { MedusaService } from "@medusajs/framework/utils"
import {
  TestCallout,
  TestRecipe,
  TestSection,
  TestSettings,
  TestSettingsLink,
  TestStep,
  TestTag,
  TestTip,
} from "./models"

/**
 * The content module of the plugin's own tests: it plays the project's module that holds the content
 * models, so the plugin's workflows and routes run against real tables.
 */
export default class TestContentModuleService extends MedusaService({
  TestRecipe,
  TestSection,
  TestStep,
  TestTip,
  TestCallout,
  TestTag,
  TestSettings,
  TestSettingsLink,
}) {}

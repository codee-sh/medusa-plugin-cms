import { Module } from "@medusajs/framework/utils"
import TestContentModuleService from "./service"

export const TEST_CONTENT_MODULE = "testContent"

export default Module(TEST_CONTENT_MODULE, {
  service: TestContentModuleService,
})

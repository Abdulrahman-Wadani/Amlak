import {
  createAssetSchema,
  createPlaceSchema,
  loginSchema,
  registerSchema,
} from "@amlak/shared"

export const signInInput = loginSchema

export const signUpInput = registerSchema

export const placeInput = createPlaceSchema

export const assetInput = createAssetSchema

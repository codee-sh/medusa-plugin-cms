---
{"title": "useFormContext renders its component on every form state change", "modules": ["cms"], "areas": ["admin"], "topics": ["ui"]}
---

# useFormContext renders its component on every form state change

react-hook-form's `FormProvider` (7.83.0, `dist/index.esm.mjs`) puts its methods in a `useMemo` whose
dependencies include `formState`, and `useForm` hands out a new `formState` proxy whenever the state it
tracks changes (`_formControl.current.formState = useMemo(() => getProxyFormState(formState, control),
[control, formState])`). The context value is therefore a new object after every change of `isDirty`,
the errors or a submit, and every component calling `useFormContext()` renders with it - `React.memo`
on a field does not help, as a context change bypasses it. The dashboard's `Form` and
`RouteFocusModal.Form` are this `FormProvider`, so it holds in every Admin form. Nothing looks wrong:
the fields render correctly, only once per field for each change, which a large form pays for.

The object `useForm` returns is the same across renders. Hand a memoized field the form through a
context of the form's own whose value is memoized on stable values, as `DocumentFormProvider` in
`src/admin/cms/common/document-form-provider/` does, or as a prop; keep `useFormContext` out of
components meant to skip the form's renders.

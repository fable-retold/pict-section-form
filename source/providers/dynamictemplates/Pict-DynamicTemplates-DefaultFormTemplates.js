module.exports = (
{
	"TemplatePrefix": "Pict-MT-Base",
	"Templates":
	[
		/*
		 *
		 * [ Metacontroller Templates ]
		 *
		 */
		// the form "Header", rendered once before the dynamic views, after which come the section(s), then their group(s)
		{
			"HashPostfix": "-Template-Form-Container-Header",
			"Template": /*HTML*/`
<!-- Pict Form Metacontroller container Header

  ;,//;,    ,;/
 o:::::::;;///
>::::::::;;\\\
  ''\\\\'" ';\

Glug glug glug Oo... -->
<div id="Pict-{~D:Context[0].UUID~}-FormContainer" class="pict-form">`
		},
		//
		{
			"HashPostfix": "-Template-Form-Container-Wrap-Prefix",
			"Template": /*HTML*/`
<!-- Pict Form Metacontroller container [{~D:Context[0].UUID~}] -->
<div id="Pict-{~D:Context[0].UUID~}-{~D:Record.options.Hash~}-Wrap" class="pict-form">`
		},
		// the container div into which the actual view renders.
		// if you overwrite this template, make sure this ID is available on a container somewhere or auto rendering won't work
		{
			"HashPostfix": "-Template-Form-Container",
			"Template": /*HTML*/`

	<!-- Pict Form View Container [{~D:Record.UUID~}]::[{~D:Record.Hash~}] -->
	<div id="Pict-Form-Container-{~D:Record.options.Hash~}" class="pict-form-view"></div>`
		},
		{
			"HashPostfix": "-Template-Form-Container-Custom",
			"Template": /*HTML*/`

	<!-- Pict Form View Container [{~D:Record.UUID~}]::[{~D:Record.Hash~}] -->
	<div id="{~D:Record.options.CustomTargetID~}" class="pict-form-view"></div>`
		},

		// -Form-Container-Wrap-Postfix
		{
			"HashPostfix": "-Template-Form-Container-Wrap-Postfix",
			"Template": /*HTML*/`
</div>
<!-- Pict Form Metacontroller container [{~D:Context[0].UUID~}] -->
`
		},


		/*
		 *
		 * [ Basic Form Templates START ]
		 *
		 */
		// the wrapping container for a view which is a collection of form section(s)...
		{
			"HashPostfix": "-Template-Wrap-Prefix",
			"Template": /*HTML*/`
	<!-- Pict Form Wrap Prefix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] -->
`
		},
		{
			"HashPostfix": "-Template-Wrap-Postfix",
			"Template": /*HTML*/`
	<!-- Pict Form Wrap Postfix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] -->
`
		},
		// the wrapping container for each specific section in a form... for legends and the like
		{
			"HashPostfix": "-Template-Section-Prefix",
			"Template": /*HTML*/`
		<!-- Form Section Prefix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
		<div id="SECTION-{~D:Context[0].formID~}" class="pict-form-section {~D:Record.CSSClass~}">
		<h2>{~D:Record.Name~}</h2>
`
		},
		// -Form-Template-Section-Postfix
		{
			"HashPostfix": "-Template-Section-Postfix",
			"Template": /*HTML*/`
		</div>
		<!-- Form Section Postfix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
`
		},

		/*
		 * BEGIN Group and Row Templates (default)
		 */
		// a "group" is a cluster of inputs that are further categorized into row(s)
		{
			"HashPostfix": "-Template-Group-Prefix",
			"Template": /*HTML*/`
			<!-- Form Template Group Prefix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
			<div id="GROUP-{~D:Context[0].formID~}-{~D:Record.Hash~}" class="{~D:Record.CSSClass~}" {~D:Record.Macro.PictFormLayout~}>
			<h3>Group: {~D:Record.Name~}</h3>
`
		},
		// row(s) are useful when our form has multiple inputs on some lines and a single on another...
		// like city, state and zip all in the same "row" of an address form
		{
			"HashPostfix": "-Template-Row-Prefix",
			"Template": /*HTML*/`
				<!-- Form Template Row Prefix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
				<div>
`
		},
		{
			"HashPostfix": "-Template-Row-Postfix",
			"Template": /*HTML*/`
				</div>
				<!-- Form Template Row Postfix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
`
		},
		{
			"HashPostfix": "-Template-VerticalRow-Prefix",
			"Template": /*HTML*/`
				<!-- Form Template Vertical Row Prefix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
				<div class="pict-form-vertical-group">
`
		},
		{
			"HashPostfix": "-Template-VerticalRow-Postfix",
			"Template": /*HTML*/`
				</div>
				<!-- Form Template Vertical Row Postfix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
`
		},
		{
			"HashPostfix": "-Template-Group-Postfix",
			"Template": /*HTML*/`
			</div>
			<!-- Form Template Group Prefix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
`
		},
		/*
		 * END Group and Row Templates (default)
		 */

		/*
		 * BEGIN Input Templates (default)
		 */
		{
			"HashPostfix": "-Template-Input",
			"Template": /*HTML*/`
					<!-- DEFAULT Input {~"D:Record.Hash~} {~D:Record.DataType~} -->
					<span>{~D:Record.Name~}:</span> <input type="text" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
`
		},
		{
			"HashPostfix": "-Template-Input-DataType-String",
			"Template": /*HTML*/`
					<!-- DataType Number {~D:Record.Hash~} {~D:Record.DataType~} -->
					<span>{~D:Record.Name~}:</span> <input type="text" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
`
		},
		{
			"HashPostfix": "-Template-Input-DataType-Number",
			"Template": /*HTML*/`
					<!-- DataType Number {~D:Record.Hash~} {~D:Record.DataType~} -->
					<span>{~D:Record.Name~}:</span> <input type="Number" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
`
		},
		{
			"HashPostfix": "-Template-Input-DataType-PreciseNumber",
			"Template": /*HTML*/`
					<!-- DataType PreciseNumber {~D:Record.Hash~} {~D:Record.DataType~} -->
					<span>{~D:Record.Name~}:</span> <input type="Number" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-PreciseNumberReadOnly",
			"DefaultInputExtensions": ["Pict-Input-PreciseNumber"],
			"Template": /*HTML*/`
					<!-- InputType PreciseNumberReadOnly {~D:Record.Hash~} {~D:Record.DataType~} -->
					<span>{~D:Record.Name~}:</span>
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} value="">
					<input type="text" {~D:Record.Macro.ControlAttr~} id="INPUT-FOR-{~D:Record.Macro.RawHTMLID~}" value="" readonly="readonly">
`
		},

		{
			"HashPostfix": "-Template-Input-InputType-TextArea",
			"Template": /*HTML*/`
					<!-- InputType TextArea {~D:Record.Hash~} {~D:Record.DataType~} -->
					<span>{~D:Record.Name~}:</span> <textarea {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~}></textarea>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-Option",
			"DefaultInputExtensions": ["Pict-Input-Select"],
			"Template": /*HTML*/`
					<!-- InputType Option {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<span>{~D:Record.Name~}:</span> <select {~D:Record.Macro.ControlAttr~} id="SELECT-FOR-{~D:Record.Macro.RawHTMLID~}" onchange="{~D:Record.Macro.DataRequestFunction~}"></select>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-Boolean",
			"Template": /*HTML*/`
					<!-- InputType Boolean {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="checkbox" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
`
		},
		{
			"HashPostfix": "-Template-Input-DataType-DateTime",
			"DefaultInputExtensions": ["Pict-Input-DateTime"],
			"Template": /*HTML*/`
					<!-- DataType DateTime {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} value="">
					<span>{~D:Record.Name~}:</span> <input {~D:Record.Macro.ControlAttr~} id="DATETIME-INPUT-FOR-{~D:Record.Macro.RawHTMLID~}" onchange="{~D:Record.Macro.DataRequestFunction~}" type="datetime-local" value="" />
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-Hidden",
			"Template": /*HTML*/`
					<!-- InputType Hidden {~D:Record.Hash~} {~D:Record.DataType~} -->
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-Color",
			"Template": /*HTML*/`
					<!-- InputType Color {~D:Record.Hash~} {~D:Record.DataType~} -->
					<span>{~D:Record.Name~}:</span> <input type="color" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} />
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-DisplayOnly",
			"Template": /*HTML*/`
					<!-- InputType DisplayOnly {~D:Record.Hash~} {~D:Record.DataType~} -->
					<span>{~D:Record.Name~}:</span> <span {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~}></span>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-ReadOnly",
			"Template": /*HTML*/`
					<!-- InputType ReadOnly {~D:Record.Hash~} {~D:Record.DataType~} -->
					<span>{~D:Record.Name~}:</span> <input type="text" readonly {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~}></input>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-Link",
			"DefaultInputExtensions": ["Pict-Input-Link"],
			"Template": /*HTML*/`
					<!-- InputType Link {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} value="">
					<a {~D:Record.Macro.ControlAttr~} id="INPUT-FOR-{~D:Record.Macro.RawHTMLID~}">{~D:Record.Name~}</a>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-Chart",
			"DefaultInputExtensions": ["Pict-Input-Chart"],
			"Template": /*HTML*/`
					<!-- InputType Chart {~D:Record.Hash~} {~D:Record.DataType~} -->
					<div style="width:{~DWAF:Record.PictForm.QuantizedWidth:100~}%; display:inline-block;">
						<input type="hidden" id="CONFIG-FOR-{~D:Record.Macro.RawHTMLID~}" value="">
						<h3><span>{~D:Record.Name~}:</span></h3>
						<div style="width:100%;"><canvas id="CANVAS-FOR-{~D:Record.Macro.RawHTMLID~}" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~}></canvas></div>
					</div>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-Markdown",
			"DefaultInputExtensions": ["Pict-Input-Markdown"],
			"Template": /*HTML*/`
					<!-- InputType Markdown {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<span>{~D:Record.Name~}:</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-markdown"></div>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-HTML",
			"DefaultInputExtensions": ["Pict-Input-HTML"],
			"Template": /*HTML*/`
					<!-- InputType Markdown {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<span>{~D:Record.Name~}:</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-html"></div>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-Templated",
			"DefaultInputExtensions": ["Pict-Input-Templated"],
			"Template": /*HTML*/`
					<!-- InputType Templated {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-templated"></div>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-TemplatedEntityLookup",
			"DefaultInputExtensions": ["Pict-Input-TemplatedEntityLookup"],
			"Template": /*HTML*/`
					<!-- InputType TemplatedEntityLookup {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<span>{~D:Record.Name~}:</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}"></div>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-RichText",
			"DefaultInputExtensions": ["Pict-Input-RichText"],
			"Template": /*HTML*/`
					<!-- InputType RichText {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<span>{~D:Record.Name~}:</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-richtext"></div>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-Diagram",
			"DefaultInputExtensions": ["Pict-Input-Diagram"],
			"Template": /*HTML*/`
					<!-- InputType Diagram {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<span>{~D:Record.Name~}:</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-diagram"></div>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-ObjectEditor",
			"DefaultInputExtensions": ["Pict-Input-ObjectEditor"],
			"Template": /*HTML*/`
					<!-- InputType ObjectEditor {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<span>{~D:Record.Name~}:</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-objecteditor"></div>
`
		},
		/*
		 * END Input Templates (default)
		 */
		/*
		 * BEGIN Vertical Input Templates
		 */
		{
			"HashPostfix": "-VerticalTemplate-Input",
			"Template": /*HTML*/`
					<!-- DEFAULT Input {~"D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<input type="text" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-DataType-String",
			"Template": /*HTML*/`
					<!-- DataType Number {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<input type="text" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-DataType-Number",
			"Template": /*HTML*/`
					<!-- DataType Number {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<input type="Number" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-DataType-PreciseNumber",
			"Template": /*HTML*/`
					<!-- DataType PreciseNumber {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<input type="Number" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-PreciseNumberReadOnly",
			"DefaultInputExtensions": ["Pict-Input-PreciseNumber"],
			"Template": /*HTML*/`
					<!-- InputType PreciseNumberReadOnly {~D:Record.Hash~} {~D:Record.DataType~} -->
					<div class="pict-form-vertical-input">
						<span>{~D:Record.Name~}:</span>
						<input type="hidden" {~D:Record.Macro.InputFullProperties~} value="">
						<input type="text" {~D:Record.Macro.ControlAttr~} id="INPUT-FOR-{~D:Record.Macro.RawHTMLID~}" value="" readonly="readonly">
					</div>

`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-TextArea",
			"Template": /*HTML*/`
					<!-- InputType TextArea {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<textarea {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~}></textarea>
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-Option",
			"DefaultInputExtensions": ["Pict-Input-Select"],
			"Template": /*HTML*/`
					<!-- InputType Option {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<select {~D:Record.Macro.ControlAttr~} id="SELECT-FOR-{~D:Record.Macro.RawHTMLID~}" onchange="{~D:Record.Macro.DataRequestFunction~}"></select>
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-Boolean",
			"Template": /*HTML*/`
					<!-- InputType Boolean {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<input type="checkbox" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-DataType-DateTime",
			"DefaultInputExtensions": ["Pict-Input-DateTime"],
			"Template": /*HTML*/`
					<!-- DataType DateTime {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} value="">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<input {~D:Record.Macro.ControlAttr~} id="DATETIME-INPUT-FOR-{~D:Record.Macro.RawHTMLID~}" onchange="{~D:Record.Macro.DataRequestFunction~}" type="datetime-local" value="" />
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-Color",
			"Template": /*HTML*/`
					<!-- InputType Color {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<input type="color" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} />
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-DisplayOnly",
			"Template": /*HTML*/`
					<!-- InputType DisplayOnly {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<span {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~}></span>
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-ReadOnly",
			"Template": /*HTML*/`
					<!-- InputType ReadOnly {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<input type="text" readonly {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~}></input>
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-Link",
			"DefaultInputExtensions": ["Pict-Input-Link"],
			"Template": /*HTML*/`
					<!-- InputType Link {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} value="">
					<a {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~}>{~D:Record.Name~}</a>
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-Markdown",
			"DefaultInputExtensions": ["Pict-Input-Markdown"],
			"Template": /*HTML*/`
					<!-- InputType Markdown {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-markdown"></div>
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-HTML",
			"DefaultInputExtensions": ["Pict-Input-HTML"],
			"Template": /*HTML*/`
					<!-- InputType Markdown {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-html"></div>
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-Templated",
			"DefaultInputExtensions": ["Pict-Input-Templated"],
			"Template": /*HTML*/`
				<!-- InputType Templated {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-templated"></div>
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-TemplatedEntityLookup",
			"DefaultInputExtensions": ["Pict-Input-TemplatedEntityLookup"],
			"Template": /*HTML*/`
					<!-- InputType TemplatedEntityLookup {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<span>{~D:Record.Name~}:</span>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}"></div>
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-RichText",
			"DefaultInputExtensions": ["Pict-Input-RichText"],
			"Template": /*HTML*/`
					<!-- InputType RichText {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<label class="pict-form-label">{~D:Record.Name~}</label>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-richtext"></div>
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-Diagram",
			"DefaultInputExtensions": ["Pict-Input-Diagram"],
			"Template": /*HTML*/`
					<!-- InputType Diagram {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<label class="pict-form-label">{~D:Record.Name~}</label>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-diagram"></div>
				</div>
`
		},
		{
			"HashPostfix": "-VerticalTemplate-Input-InputType-ObjectEditor",
			"DefaultInputExtensions": ["Pict-Input-ObjectEditor"],
			"Template": /*HTML*/`
					<!-- InputType ObjectEditor {~D:Record.Hash~} {~D:Record.DataType~} -->
				<div class="pict-form-vertical-input">
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<label class="pict-form-label">{~D:Record.Name~}</label>
					<span>{~D:Record.PictForm.ExtraDescription~}</span>
					<div {~D:Record.Macro.ControlAttr~} id="DISPLAY-FOR-{~D:Record.Macro.RawHTMLID~}" class="pict-section-form-objecteditor"></div>
				</div>
`
		},
		/*
		 * END Vertical Input Templates (default)
		 */
		/*
		 *
		 * [ External Control Templates START ]
		 *
		 */
		/*
		 * Tab Groups are sets of Groups within a single Section that are shown/hidden when a tab control is clicked.
		 * 
		 * For example from the complex tabular application manifest descriptors:
		 *
		...
			"UI.StatisticsTabState": {
				Name: "Statistics Tab State",
				Hash: "StatisticsTabState",
				DataType: "String",
				PictForm: { Section: "Recipe", Group: "StatisticsTabs", 
					InputType: "TabGroupSelector",
					// The default when there is no state is the first entry here.
					// If you want to set a default, you can just do it in the state address though.
					TabGroupSet: ["Statistics", "FruitStatistics"] }
			},
		...
		 *
		 */
		{
			"HashPostfix": "-Template-Input-InputType-TabGroupSelector",
			"DefaultInputExtensions": ["Pict-Input-TabGroupSelector"],
			"Template": /*HTML*/`
					<!-- InputType TabGroupSelector {~D:Record.Hash~} {~D:Record.DataType~} -->
					<!-- the TabSelector Input provider deals with populating this from the manifest. -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<!-- <span>{~D:Record.Name~}:</span> -->
					<div {~D:Record.Macro.ControlAttr~} id="TAB-SELECT-FOR-{~D:Record.Macro.RawHTMLID~}"></div>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-TabGroupSelector-TabElement",
			"Template": /*HTML*/`
			<!-- Sections have "tab groups" which are defined by the hash of the Descriptor that hosts the current TabGroup value. -->
			<a href="#/" id="TAB-{~D:Context[1].TabGroupHash~}-{~D:Record.Macro.RawHTMLID~}" onclick="{~P~}.providers['Pict-Input-TabGroupSelector'].selectTabByViewHash('{~D:Context[0].Hash~}','{~D:Record.Hash~}', '{~D:Context[1].TabGroupHash~}')">{~D:Context[1].TabGroupName~}</a>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-TabGroupSelector-EmptyGroupContent",
			"Template": /*HTML*/`
			<!-- This is the template for if the tmpInput.PictForm.TabGroupSet array is empty. -->
			<p>Warning! No tabs to select from for {~D:Record.TabGroupSetRawHTMLID~}</p>
`
		},
		/*
		 * Tab Sections are sets of Sections within a single Section that are shown/hidden when a tab control is clicked.
		 * 
		 * For example from the complex tabular application manifest descriptors:
		 *
		...

		...
		 *
		 */
		{
			"HashPostfix": "-Template-Input-InputType-TabSectionSelector",
			"DefaultInputExtensions": ["Pict-Input-TabSectionSelector"],
			"Template": /*HTML*/`
					<!-- InputType TabSectionSelector {~D:Record.Hash~} {~D:Record.DataType~} -->
					<!-- the TabSelector Input provider deals with populating this from the manifest. -->
					<input type="hidden" {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} value="">
					<!-- <span>{~D:Record.Name~}:</span> -->
					<div {~D:Record.Macro.ControlAttr~} id="TAB-SELECT-FOR-{~D:Record.Macro.RawHTMLID~}"></div>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-TabSectionSelector-TabElement",
			"Template": /*HTML*/`
			<!-- Sections have "tab groups" which are defined by the hash of the Descriptor that hosts the current TabSection value. -->
			<a href="#/" id="TAB-{~D:Context[1].TabSectionHash~}-{~D:Record.Macro.RawHTMLID~}" onclick="{~P~}.providers['Pict-Input-TabSectionSelector'].selectTabByViewHash('{~D:Context[0].Hash~}','{~D:Record.Hash~}', '{~D:Context[1].TabSectionHash~}')">{~D:Context[1].TabSectionName~}</a>
`
		},
		{
			"HashPostfix": "-Template-Input-InputType-TabSectionSelector-EmptyGroupContent",
			"Template": /*HTML*/`
			<!-- This is the template for if the tmpInput.PictForm.TabSectionSet array is empty. -->
			<p>Warning! No tabs to select from for {~D:Record.TabSectionSetRawHTMLID~}</p>
`
		},
		/*
		 * END View Management Templates (default)
		 */
		/*
		 *
		 * [ Basic Form Templates END ]
		 *
		 */

		/*
		 *
		 * [ External Control Templates START ]
		 *
		 */
		{
			"HashPostfix": "-TuiGrid-Container",
			"Template": /*HTML*/`
			<div {~D:Record.Macro.ControlAttr~} id="{~D:Record.TuiGridHTMLID~}"></div>
`
		},
		{
			"HashPostfix": "-TuiGrid-Controls",
			"Template": /*HTML*/`
			<div>[ <a href="#/" onclick="{~P~}.providers['Pict-Layout-TuiGrid'].addRow('{~D:Context[0].Hash~}', {~D:Record.GroupIndex~})">create</a> ]</div>
`
		},
		/*
		 *
		 * [ External Control Templates END ]
		 *
		 */


		/*
		 *
		 * [ RecordSet Templates START ]
		 *
		 */
		{
			"HashPostfix": "-RecordSetTemplate-Group-Prefix",
			"Template": /*HTML*/`
			<div {~D:Record.Macro.PictFormLayout~}>
			<!-- Form RecordSet Template Group Prefix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
`
		},
		{
			"HashPostfix": "-RecordSetTemplate-Group-Postfix",
			"Template": /*HTML*/`
			<div><a href="#/" onclick="{~D:Record.Macro.TabularCreateRowFunctionCall~}">create</a></div>
			</div>
			<!-- Form RecordSet Template Group Prefix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
`
		},


		/*
		 * BEGIN RecordSet Template "Extra" Columns
		 * these are meant to be easy ways to add controls to the left or right side of a record column
		 */

		{
			"HashPostfix": "-RecordSetTemplate-Row-ExtraPrefix",
			"Template": /*HTML*/`<!-- RecordSetTemplateRow-ExtraPrefix -->`
		},
		// by default PICT puts a "delete row" button on the right side of a RecordSet Templateset
		{
			"HashPostfix": "-RecordSetTemplate-Row-ExtraPostfix",
			"Template": /*HTML*/`<!-- RecordSetTemplateRow-ExtraPostfix-->
					<div class="PictSectionForm-RecordSet-Controls">
						<a href="#/" onClick="{~P~}.views['{~D:Context[0].Hash~}'].deleteDynamicTableRow({~D:Record.Group~},'{~D:Record.Key~}')">del</a>
						<a href="#/" onClick="{~P~}.views['{~D:Context[0].Hash~}'].moveDynamicTableRowUp({~D:Record.Group~},'{~D:Record.Key~}')">up</a>
						<a href="#/" onClick="{~P~}.views['{~D:Context[0].Hash~}'].moveDynamicTableRowDown({~D:Record.Group~},'{~D:Record.Key~}')">down</a>
					</div>
`
		},
		/*
		 * END RecordSet Template "Extra" Columns
		 */

		/*
		 * BEGIN RecordSet TemplateSet Templates ("row" and "cell" prefix/postfix ... tr/td)
		 * (these are repeated for each "row" which is a record, and then wrap each "cell" which is a columnar input)
		 */
		{
			"HashPostfix": "-RecordSetTemplate-Row-Prefix",
			"Template": /*HTML*/`
					<div class="RecordSetEntry">
					<!-- RecordSetTemplateRow-Prefix -->
`
		},
		{
			"HashPostfix": "-RecordSetTemplate-Cell-Prefix",
			"Template": /*HTML*/`
						<div style="display:inline;">
							<!-- RecordSetTemplateCell-Prefix -->
							<span class="RecordSetInputLabel">{~D:Record.Name~}</span>
`
		},
		{
			"HashPostfix": "-RecordSetTemplate-Cell-Postfix",
			"Template": /*HTML*/`
							<!-- RecordSetTemplateCell-Postfix -->
						</div>
`
		},
		{
			"HashPostfix": "-RecordSetTemplate-Row-Postfix",
			"Template": /*HTML*/`
					<!-- RecordSetTemplateRow-Postfix -->
					</div>`
		},
		/*
		 * END RecordSet TemplateSet Templates
		 */



		/*
		 *
		 * [ Tabular Templates START ]
		 *
		 */
		{
			"HashPostfix": "-TabularTemplate-Group-Prefix",
			"Template": /*HTML*/`
			<div id="GROUP-{~D:Context[0].formID~}-{~D:Record.Hash~}" {~D:Record.Macro.PictFormLayout~}>
			<table>
					<tbody>
			<!-- Form Tabular Template Group Prefix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
`
		},
		{
			"HashPostfix": "-TabularTemplate-Group-Postfix",
			"Template": /*HTML*/`
				</tbody>
			</table>
			<div><a href="#/" onclick="{~D:Record.Macro.TabularCreateRowFunctionCall~}">create</a></div>
			</div>
			<!-- Form Tabular Template Group Prefix [{~D:Context[0].UUID~}]::[{~D:Context[0].Hash~}] {~D:Record.Hash~}::{~D:Record.Name~} -->
`
		},

		/*
		 * BEGIN Tabular Template "Extra" Columns
		 * these are meant to be easy ways to add controls to the left or right side of a record column
		 */
		{
			"HashPostfix": "-TabularTemplate-RowHeader-ExtraPrefix",
			"Template": /*HTML*/`<!-- TabularTemplateRowHeader-ExtraPrefix -->`
		},
		// because the row extension template below adds an extra column, we need to make our header have parity
		{
			"HashPostfix": "-TabularTemplate-RowHeader-ExtraPostfix",
			"Template": /*HTML*/`<!-- TabularTemplateRowHeader-ExtraPostfix -->
						<th style="min-width:100px;"></th>
`
		},
		{
			"HashPostfix": "-TabularTemplate-Row-ExtraPrefix",
			"Template": /*HTML*/`<!-- TabularTemplateRow-ExtraPrefix -->`
		},
		// by default PICT puts a "delete row" button on the right side of a tabular templateset
		{
			"HashPostfix": "-TabularTemplate-Row-ExtraPostfix",
			"Template": /*HTML*/`<!-- TabularTemplateRow-ExtraPostfix-->
					<td><a href="#/" onClick="{~P~}.views['{~D:Context[0].Hash~}'].deleteDynamicTableRow({~D:Record.Group~},'{~D:Record.Key~}')">del</a>
					<a href="#/" onClick="{~P~}.views['{~D:Context[0].Hash~}'].moveDynamicTableRowUp({~D:Record.Group~},'{~D:Record.Key~}')">up</a>
					<a href="#/" onClick="{~P~}.views['{~D:Context[0].Hash~}'].moveDynamicTableRowDown({~D:Record.Group~},'{~D:Record.Key~}')">down</a></td>
`
		},
		/*
		 * END Tabular Template "Extra" Columns
		 */

		/*
		 * BEGIN Tabular Template Header Columns
		 */
		{
			"HashPostfix": "-TabularTemplate-RowHeader-Prefix",
			"Template": /*HTML*/`
				<thead>
					<tr>
`
		},
		{
			"HashPostfix": "-TabularTemplate-HeaderCell",
			"Template": /*HTML*/`
						<!-- Descriptor {~D:Record.Name~} [{~D:Record.Hash~}] -> {~D:Record.Address~} -->
						<th data-tabular-column-index="{~D:Record.PictForm.InputIndex~}">{~D:Record.Name~}</th>
`
		},
		{
			// The column label only (no <th> wrapper). Used by the ColumnSorting
			// header cell so the label resolves dynamically on every render -- the
			// same way the default HeaderCell above does -- instead of being baked
			// as a static string when the template is built. This lets DynamicColumns
			// name changes (e.g. via refreshtabularsection) update the visible header
			// without a full rebuildCustomTemplate.
			"HashPostfix": "-TabularTemplate-HeaderCellLabel",
			"Template": /*HTML*/`{~D:Record.Name~}`
		},
		{
			"HashPostfix": "-TabularTemplate-RowHeader-Postfix",
			"Template": /*HTML*/`
					</tr>
				</thead>
				<tbody>
`
		},
		/*
		 * END Tabular Template Header Columns
		 */

		/*
		 * BEGIN Tabular Template Extra Header Rows
		 * Used for stacked/clustered headers (the Group's `Headers` config).
		 * Each entry in Headers is one ADDITIONAL header row stacked above the
		 * default column-name row. Cells carry { Label, ColumnSpan, CSSClass }.
		 */
		{
			"HashPostfix": "-TabularTemplate-ExtraHeaderRow-Prefix",
			"Template": /*HTML*/`
					<tr class="pict-tabular-extra-header-row">
`
		},
		{
			"HashPostfix": "-TabularTemplate-ExtraHeaderRow-Postfix",
			"Template": /*HTML*/`
					</tr>
`
		},
		{
			"HashPostfix": "-TabularTemplate-ExtraHeaderCell",
			"Template": /*HTML*/`<th colspan="{~D:Record.ColumnSpan~}" class="pict-tabular-extra-header-cell {~D:Record.CSSClass~}">{~D:Record.Label~}</th>`
		},
		/*
		 * END Tabular Template Extra Header Rows
		 */

		/*
		 * BEGIN Tabular Template Row Label Columns
		 * Used for left-side label columns (the Group's `RowLabels` config).
		 * Header cell renders one <th> per RowLabels entry. Per-row cell renders
		 * one <td> per RowLabels entry; rowspans collapse consecutive equal
		 * values when `Cluster: true`. Skipped cells emit nothing (a real <td>
		 * upstream has already covered them via rowspan).
		 */
		{
			"HashPostfix": "-TabularTemplate-RowLabel-HeaderCell",
			"Template": /*HTML*/`<th class="pict-row-label-header">{~D:Record.Name~}</th>`
		},
		{
			"HashPostfix": "-TabularTemplate-RowLabel-Cell",
			"Template": /*HTML*/`<td rowspan="{~D:Record.RowSpan~}" class="pict-row-label">{~D:Record.RenderedLabel~}</td>`
		},
		{
			"HashPostfix": "-TabularTemplate-RowLabel-Cell-Skipped",
			"Template": ``
		},
		/*
		 * END Tabular Template Row Label Columns
		 */

		/*
		 * BEGIN Tabular TemplateSet Templates (row and cell prefix/postfix ... tr/td)
		 * (these are repeated for each "row" which is a record, and then wrap each "cell" which is a columnar input)
		 */
		{
			"HashPostfix": "-TabularTemplate-Row-Prefix",
			"Template": /*HTML*/`
					<tr data-tabular-row-index="{~D:Record.Key~}" data-tabular-group-index="{~D:Record.Group~}">{~T:TabularTemplateRow-ExtraPrefix~}
`
		},
		{
			"HashPostfix": "-TabularTemplate-Cell-Prefix",
			"Template": /*HTML*/`
						<td data-tabular-column-index="{~D:Record.PictForm.InputIndex~}"><!-- {~D:Record.Name~}  -->
`
		},
		{
			"HashPostfix": "-TabularTemplate-Cell-Postfix",
			"Template": /*HTML*/`
						</td>
`
		},
		{
			"HashPostfix": "-TabularTemplate-Row-Postfix",
			"Template": /*HTML*/`
					{~T:TabularTemplateRow-ExtraPostfix~}</tr>`
		},
		/*
		 * END Tabular TemplateSet Templates
		 */


		/*
		 * BEGIN Tabular Input Templates
		 */
		{
			"HashPostfix": "-TabularTemplate-Begin-Input",
			"Template": /*HTML*/`
					<!-- DEFAULT Input {~"D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="text" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.HTMLName~} {~D:Record.Macro.InformaryTabular~} `
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input",
			"Template": /*HTML*/` value="">`
		},

		{
			"HashPostfix": "-TabularTemplate-Mid-Input",
			"Template": /*HTML*/`  `
		},
		{
			"HashPostfix": "-TabularTemplate-InformaryAddress-Input",
			"Template": /*HTML*/` data-i-index="{~D:Context[2].Key~}" onchange="{~P~}.views['{~D:Context[0].Hash~}'].dataChangedTabular('{~D:Context[2].Group~}', '{~D:Record.PictForm.InputIndex~}', '{~D:Context[2].Key~}')"  `
		},

		{
			"HashPostfix": "-TabularTemplate-Begin-Input-DataType-String",
			"Template": /*HTML*/`
					<!-- DataType Number {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="text" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.HTMLName~} {~D:Record.Macro.InformaryTabular~} `
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-DataType-String",
			"Template": /*HTML*/` value="">`
		},

		{
			"HashPostfix": "-TabularTemplate-Begin-Input-DataType-Number",
			"Template": /*HTML*/`
					<!-- DataType Number {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="Number" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.HTMLName~} {~D:Record.Macro.InformaryTabular~} `
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-DataType-Number",
			"Template": /*HTML*/` value="">
`
		},

		{
			"HashPostfix": "-TabularTemplate-Begin-Input-DataType-PreciseNumber",
			"Template": /*HTML*/`
					<!-- DataType PreciseNumber {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="Number" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.HTMLName~} {~D:Record.Macro.InformaryTabular~} id="TABULAR-DATA-{~D:Record.Macro.RawHTMLID~}-{~D:Context[2].Key~}" `
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-DataType-PreciseNumber",
			"Template": /*HTML*/` value="">
`
		},

		{
			"HashPostfix": "-TabularTemplate-Begin-Input-InputType-PreciseNumberReadOnly",
			"DefaultInputExtensions": ["Pict-Input-PreciseNumber"],
			"Template": /*HTML*/`
					<!-- InputType PreciseNumberReadOnly {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" id="PRECISE-TABULAR-DATA-{~D:Record.Macro.RawHTMLID~}-{~D:Context[2].Key~}" {~D:Record.Macro.InformaryTabular~}
`
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-InputType-PreciseNumberReadOnly",
			"Template": /*HTML*/`
						value="">
					<input type="text" {~D:Record.Macro.ControlAttr~} id="TABULAR-DATA-{~D:Record.Macro.RawHTMLID~}-{~D:Context[2].Key~}" {~D:Record.Macro.HTMLName~} value="" readonly="readonly">
`
		},
		{
			"HashPostfix": "-TabularTemplate-Begin-Input-InputType-TextArea",
			"Template": /*HTML*/`
					<!-- InputType TextArea {~D:Record.Hash~} {~D:Record.DataType~} -->
					<textarea {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.HTMLName~} {~D:Record.Macro.InformaryTabular~} `
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-InputType-TextArea",
			"Template": /*HTML*/` ></textarea>
`
		},
		{
			"HashPostfix": "-TabularTemplate-Begin-Input-InputType-Option",
			"DefaultInputExtensions": ["Pict-Input-Select"],
			"Template": /*HTML*/`
					<!-- InputType Option {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" id="SELECT-TABULAR-DATA-{~D:Record.Macro.RawHTMLID~}-{~D:Context[2].Key~}" {~D:Record.Macro.InformaryTabular~} `
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-InputType-Option",
			"Template": /*HTML*/` value="">
					<select {~D:Record.Macro.ControlAttr~} id="SELECT-TABULAR-DROPDOWN-{~D:Record.Macro.RawHTMLID~}-{~D:Context[2].Key~}" {~D:Record.Macro.HTMLName~} onchange="{~P~}.views['{~D:Context[0].Hash~}'].inputDataRequestTabular('{~D:Context[2].Group~}', '{~D:Record.PictForm.InputIndex~}', '{~D:Context[2].Key~}')"></select>
`
		},
		{
			"HashPostfix": "-TabularTemplate-Begin-Input-InputType-Boolean",
			"Template": /*HTML*/`
					<!-- InputType Boolean {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="checkbox" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.HTMLName~} {~D:Record.Macro.InformaryTabular~} `
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-InputType-Boolean",
			"Template": /*HTML*/` value="" />
`
		},
		{
			"HashPostfix": "-TabularTemplate-Begin-Input-DataType-DateTime",
			"DefaultInputExtensions": ["Pict-Input-DateTime"],
			"Template": /*HTML*/`
					<!-- DataType DateTime {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" id="DATETIME-TABULAR-DATA-{~D:Record.Macro.RawHTMLID~}-{~D:Context[2].Key~}" {~D:Record.Macro.InformaryTabular~} `
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-DataType-DateTime",
			"Template": /*HTML*/` value="">
					<input {~D:Record.Macro.ControlAttr~} id="DATETIME-TABULAR-INPUT-{~D:Record.Macro.RawHTMLID~}-{~D:Context[2].Key~}" {~D:Record.Macro.HTMLName~}
						onchange="{~P~}.views['{~D:Context[0].Hash~}'].inputDataRequestTabular('{~D:Context[2].Group~}', '{~D:Record.PictForm.InputIndex~}', '{~D:Context[2].Key~}')"
						type="datetime-local" value="" />
`
		},
		{
			"HashPostfix": "-TabularTemplate-Begin-Input-InputType-Hidden",
			"Template": /*HTML*/`
					<!-- InputType Hidden {~D:Record.Hash~} {~D:Record.DataType~} -->
					<span
`
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-InputType-Hidden",
			"Template": /*HTML*/`></span>`,
		},

		{
			"HashPostfix": "-TabularTemplate-Begin-Input-InputType-Color",
			"Template": /*HTML*/`
					<!-- InputType Color {~D:Record.Hash~} {~D:Record.DataType~} -->
					<span>{~D:Record.Name~}:</span> <input type="color" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InputChangeHandler~} {~D:Record.Macro.InformaryTabular~}`
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-InputType-Color",
			"Template": /*HTML*/` />
`
		},

		{
			"HashPostfix": "-TabularTemplate-Begin-Input-InputType-DisplayOnly",
			"Template": /*HTML*/`
					<!-- InputType DisplayOnly {~D:Record.Hash~} {~D:Record.DataType~} -->
					<span>{~D:Record.Name~}:</span> <span {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.InputFullProperties~} {~D:Record.Macro.InformaryTabular~}`
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-InputType-DisplayOnly",
			"Template": /*HTML*/` ></span>
`
		},

		{
			"HashPostfix": "-TabularTemplate-Begin-Input-InputType-ReadOnly",
			"Template": /*HTML*/`
					<!-- DataType Number {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input readonly type="text" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.HTMLName~} {~D:Record.Macro.InformaryTabular~} `
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-InputType-ReadOnly",
			"Template": /*HTML*/` value="">`
		},

		{
			"HashPostfix": "-TabularTemplate-Begin-Input-InputType-Link",
			"DefaultInputExtensions": ["Pict-Input-Link"],
			"Template": /*HTML*/`
					<!-- DataType Number {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="hidden" {~D:Record.Macro.HTMLName~} {~D:Record.Macro.InformaryTabular~} `
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-InputType-Link",
			"Template": /*HTML*/` value="">
					<a {~D:Record.Macro.ControlAttr~} id="TABULAR-DATA-{~D:Record.Macro.RawHTMLID~}-{~D:Context[2].Key~}" {~D:Record.Macro.HTMLName~}>{~D:Record.Name~}</a>`
		},

		{
			"HashPostfix": "-TabularTemplate-Begin-Input-InputType-TemplatedEntityLookup",
			"Template": /*HTML*/`
					<!-- InputType TemplatedEntityLookup {~D:Record.Hash~} {~D:Record.DataType~} -->
					<input type="text" {~D:Record.Macro.ControlAttr~} {~D:Record.Macro.HTMLName~} {~D:Record.Macro.InformaryTabular~} `
		},
		{
			"HashPostfix": "-TabularTemplate-End-Input-InputType-TemplatedEntityLookup",
			"Template": /*HTML*/` value="">`
		},

		/*
		 * END Tabular Input Templates
		 */
		/*
		 *
		 * [ Tabular Templates END ]
		 *
		 */
	]
});

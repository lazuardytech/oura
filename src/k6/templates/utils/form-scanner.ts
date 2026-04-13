import { fetchWithNode } from "../../../utils/fetcher.js";
import { logger } from "../../../utils/logger.js";

export interface FormField {
	name: string;
	type: string;
	value: string;
	placeholder: string;
	required: boolean;
	options: string[];
	tag: string;
}

export interface ScannedForm {
	action: string;
	method: string;
	fields: FormField[];
}

function parseAttributes(tag: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const attrRegex = /(\w[\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
	let match = attrRegex.exec(tag);
	while (match) {
		const key = match[1].toLowerCase();
		const val = match[2] ?? match[3] ?? match[4] ?? "";
		attrs[key] = val;
		match = attrRegex.exec(tag);
	}
	return attrs;
}

function extractForms(html: string): ScannedForm[] {
	const forms: ScannedForm[] = [];
	const formRegex = /<form([^>]*)>([\s\S]*?)<\/form>/gi;

	let formMatch = formRegex.exec(html);
	while (formMatch) {
		const formAttrs = parseAttributes(formMatch[1]);
		const formBody = formMatch[2];
		const fields: FormField[] = [];

		// Extract <input> fields
		const inputRegex = /<input([^>]*)>/gi;
		let inputMatch = inputRegex.exec(formBody);
		while (inputMatch) {
			const attrs = parseAttributes(inputMatch[1]);
			const type = attrs.type || "text";
			// Skip submit/button/image/reset inputs
			if (!["submit", "button", "image", "reset", "file"].includes(type)) {
				if (attrs.name) {
					fields.push({
						name: attrs.name,
						type,
						value: attrs.value || "",
						placeholder: attrs.placeholder || "",
						required: "required" in attrs,
						options: [],
						tag: "input",
					});
				}
			}
			inputMatch = inputRegex.exec(formBody);
		}

		// Extract <textarea> fields
		const textareaRegex = /<textarea([^>]*)>(?:([\s\S]*?)<\/textarea>)?/gi;
		let textareaMatch = textareaRegex.exec(formBody);
		while (textareaMatch) {
			const attrs = parseAttributes(textareaMatch[1]);
			if (attrs.name) {
				fields.push({
					name: attrs.name,
					type: "textarea",
					value: textareaMatch[2]?.trim() || "",
					placeholder: attrs.placeholder || "",
					required: "required" in attrs,
					options: [],
					tag: "textarea",
				});
			}
			textareaMatch = textareaRegex.exec(formBody);
		}

		// Extract <select> fields
		const selectRegex = /<select([^>]*)>([\s\S]*?)<\/select>/gi;
		let selectMatch = selectRegex.exec(formBody);
		while (selectMatch) {
			const attrs = parseAttributes(selectMatch[1]);
			const selectBody = selectMatch[2];
			const optionValues: string[] = [];
			const optionRegex =
				/<option[^>]*value\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))[^>]*>/gi;
			let optMatch = optionRegex.exec(selectBody);
			while (optMatch) {
				const val = optMatch[1] ?? optMatch[2] ?? optMatch[3] ?? "";
				if (val) optionValues.push(val);
				optMatch = optionRegex.exec(selectBody);
			}
			if (attrs.name) {
				fields.push({
					name: attrs.name,
					type: "select",
					value: "",
					placeholder: "",
					required: "required" in attrs,
					options: optionValues,
					tag: "select",
				});
			}
			selectMatch = selectRegex.exec(formBody);
		}

		forms.push({
			action: formAttrs.action || "",
			method: (formAttrs.method || "POST").toUpperCase(),
			fields,
		});

		formMatch = formRegex.exec(html);
	}

	return forms;
}

// Heuristic detection for SPA pages (React/Next.js/Vue) where forms are
// rendered client-side. We scan for common field-related keywords in the
// HTML/JS source to infer what fields exist.
//
// Fields are split into "strong" (high-confidence form inputs like email,
// password) and "weak" (generic words like message, address that appear
// often outside forms). Weak fields are only included when they co-occur
// with strong fields that suggest a contact/partnership form context.
interface FieldHint {
	pattern: RegExp;
	name: string;
	type: string;
	strong: boolean;
}

// Strong hints: almost always a form field when present as a label
const STRONG_HINTS: FieldHint[] = [
	{
		pattern: /\b(?:full[_\s-]?name|nama[_\s-]?lengkap)\b/i,
		name: "name",
		type: "text",
		strong: true,
	},
	{
		pattern: /\b(?:first[_\s-]?name)\b/i,
		name: "first_name",
		type: "text",
		strong: true,
	},
	{
		pattern: /\b(?:last[_\s-]?name)\b/i,
		name: "last_name",
		type: "text",
		strong: true,
	},
	{ pattern: /\bemail\b/i, name: "email", type: "email", strong: true },
	{
		pattern:
			/\b(?:password[_\s-]?confirmation|konfirmasi[_\s-]?(?:kata[_\s-]?sandi|password)|confirm[_\s-]?password|ulangi[_\s-]?(?:kata[_\s-]?sandi|password))\b/i,
		name: "password_confirmation",
		type: "password",
		strong: true,
	},
	{
		pattern: /\b(?:password|kata[_\s-]?sandi)\b/i,
		name: "password",
		type: "password",
		strong: true,
	},
	{
		pattern: /\b(?:whatsapp|nomor[_\s-]?(?:hp|wa|whatsapp|telepon|telp))\b/i,
		name: "phone",
		type: "tel",
		strong: true,
	},
	{
		pattern: /\b(?:username)\b/i,
		name: "username",
		type: "text",
		strong: true,
	},
];

// Weak hints: common words that may appear outside forms (footer, nav, etc.)
// Only included if the page looks like a contact/partnership form
const WEAK_HINTS: FieldHint[] = [
	{
		pattern: /\b(?:company|perusahaan|organization|organisasi)\b/i,
		name: "company",
		type: "text",
		strong: false,
	},
	{
		pattern: /\b(?:pesan|keterangan)\b/i,
		name: "message",
		type: "textarea",
		strong: false,
	},
	{
		pattern: /\b(?:subject|judul)\b/i,
		name: "subject",
		type: "text",
		strong: false,
	},
	{
		pattern: /\b(?:alamat)\b/i,
		name: "address",
		type: "text",
		strong: false,
	},
	{
		pattern: /\b(?:kota)\b/i,
		name: "city",
		type: "text",
		strong: false,
	},
];

function inferFieldsFromHtml(html: string): FormField[] {
	const fields: FormField[] = [];
	const seen = new Set<string>();

	// First pass: detect strong fields
	for (const hint of STRONG_HINTS) {
		if (hint.pattern.test(html) && !seen.has(hint.name)) {
			seen.add(hint.name);
			fields.push({
				name: hint.name,
				type: hint.type,
				value: "",
				placeholder: "",
				required: false,
				options: [],
				tag: "input",
			});
		}
	}

	// Determine form type from strong fields
	const hasPassword = seen.has("password");
	const hasConfirmation = seen.has("password_confirmation");
	const isAuthForm = hasPassword;
	const isContactForm = !isAuthForm && seen.has("email");

	// Second pass: only add weak fields for contact/partnership forms
	// Auth forms (login/register) don't need message, address, etc.
	if (isContactForm || (!isAuthForm && fields.length > 0)) {
		for (const hint of WEAK_HINTS) {
			if (hint.pattern.test(html) && !seen.has(hint.name)) {
				seen.add(hint.name);
				fields.push({
					name: hint.name,
					type: hint.type,
					value: "",
					placeholder: "",
					required: false,
					options: [],
					tag: "input",
				});
			}
		}
	}

	// If it's a register form (has password + confirmation), ensure
	// password_confirmation comes after password in the field order
	if (hasPassword && hasConfirmation) {
		const pwIdx = fields.findIndex((f) => f.name === "password");
		const confIdx = fields.findIndex((f) => f.name === "password_confirmation");
		if (confIdx >= 0 && pwIdx >= 0 && confIdx < pwIdx) {
			const [conf] = fields.splice(confIdx, 1);
			const newPwIdx = fields.findIndex((f) => f.name === "password");
			fields.splice(newPwIdx + 1, 0, conf);
		}
	}

	return fields;
}

const DEFAULT_FIELDS: FormField[] = [
	{
		name: "name",
		type: "text",
		value: "",
		placeholder: "",
		required: false,
		options: [],
		tag: "input",
	},
	{
		name: "email",
		type: "email",
		value: "",
		placeholder: "",
		required: false,
		options: [],
		tag: "input",
	},
	{
		name: "message",
		type: "textarea",
		value: "",
		placeholder: "",
		required: false,
		options: [],
		tag: "textarea",
	},
];

export async function scanFormFields(targetUrl: string): Promise<ScannedForm> {
	const html = await fetchWithNode(targetUrl, { verbose: false });

	if (!html) {
		logger.warn(
			"Could not fetch target HTML for form detection, using default fields (name, email, message)",
		);
		return { action: targetUrl, method: "POST", fields: DEFAULT_FIELDS };
	}

	// Try standard HTML form parsing first
	const forms = extractForms(html);

	let bestForm: ScannedForm | null = null;
	if (forms.length > 0) {
		bestForm = forms[0];
		for (const form of forms) {
			if (form.fields.length > bestForm.fields.length) {
				bestForm = form;
			}
		}
		if (bestForm.fields.length === 0) {
			bestForm = null;
		}
	}

	// If no HTML forms found, try SPA heuristic detection
	if (!bestForm) {
		const inferred = inferFieldsFromHtml(html);
		if (inferred.length > 0) {
			logger.info(
				"No HTML <form> found, detected fields from page content (SPA)",
			);
			bestForm = { action: targetUrl, method: "POST", fields: inferred };
		}
	}

	if (!bestForm) {
		logger.warn(
			"No form fields detected on target page, using default fields (name, email, message)",
		);
		return { action: targetUrl, method: "POST", fields: DEFAULT_FIELDS };
	}

	// Resolve relative action URL
	if (bestForm.action && !bestForm.action.startsWith("http")) {
		try {
			bestForm.action = new URL(bestForm.action, targetUrl).href;
		} catch {
			bestForm.action = targetUrl;
		}
	}
	if (!bestForm.action) {
		bestForm.action = targetUrl;
	}

	logger.info(
		`Detected ${bestForm.fields.length} form field(s): ${bestForm.fields.map((f) => f.name).join(", ")}`,
	);

	return bestForm;
}

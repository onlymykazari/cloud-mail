const encoder = new TextEncoder();

const TOLERANCE_SECONDS = 5 * 60;

const base64Decode = (str) => Uint8Array.from(atob(str), c => c.charCodeAt(0));

const base64Encode = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

const timingSafeEqual = (a, b) => {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
};

const toKeyBytes = (secret) => {
	if (secret.startsWith('whsec_')) {
		return base64Decode(secret.slice('whsec_'.length));
	}
	return encoder.encode(secret);
};

const svixUtils = {

	// 仅支持单一 webhook 密钥, 若配置了多个 Resend 账号/域名各自的 webhook, 只有匹配该密钥的端点能通过校验
	async verify(secret, headers, rawBody) {
		try {

			const svixId = headers.get('svix-id');
			const svixTimestamp = headers.get('svix-timestamp');
			const svixSignature = headers.get('svix-signature');

			if (!svixId || !svixTimestamp || !svixSignature) {
				console.log('resend webhook missing svix headers');
				return false;
			}

			const timestamp = Number(svixTimestamp);

			if (!Number.isFinite(timestamp)) {
				console.log('resend webhook invalid svix-timestamp');
				return false;
			}

			const now = Math.floor(Date.now() / 1000);

			if (Math.abs(now - timestamp) > TOLERANCE_SECONDS) {
				console.log('resend webhook timestamp out of tolerance');
				return false;
			}

			const key = await crypto.subtle.importKey(
				'raw',
				toKeyBytes(secret),
				{ name: 'HMAC', hash: 'SHA-256' },
				false,
				['sign']
			);

			const signed = await crypto.subtle.sign(
				'HMAC',
				key,
				encoder.encode(`${svixId}.${svixTimestamp}.${rawBody}`)
			);

			const expected = base64Encode(signed);

			const matched = svixSignature.split(' ').some(item => {
				const [version, signature] = item.split(',');
				return version === 'v1' && signature && timingSafeEqual(signature, expected);
			});

			if (!matched) {
				console.log('resend webhook signature mismatch');
			}

			return matched;

		} catch (err) {
			console.log(err);
			return false;
		}
	}
};

export default svixUtils;

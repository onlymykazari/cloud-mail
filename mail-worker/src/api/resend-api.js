import resendService from '../service/resend-service';
import svixUtils from '../utils/svix-utils';
import app from '../hono/hono';
app.post('/webhooks',async (c) => {
	try {

		const rawBody = await c.req.text();
		const secret = c.env.resend_webhook_secret;

		if (secret) {
			const valid = await svixUtils.verify(secret, c.req.raw.headers, rawBody);
			if (!valid) {
				return c.text('invalid signature', 401)
			}
		} else {
			console.log('resend webhook secret not configured, signature verification skipped');
		}

		let body;

		try {
			body = JSON.parse(rawBody);
		} catch (e) {
			console.log('resend webhook invalid payload');
			return c.text('invalid payload', 400)
		}

		await resendService.webhooks(c, body);
		return c.text('success', 200)
	} catch (e) {
		return  c.text(e.message, 500)
	}
})

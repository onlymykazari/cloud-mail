import emailService from './email-service';
import { emailConst } from '../const/entity-const';

const eventStatusMap = {
	'email.sent': emailConst.status.SENT,
	'email.delivered': emailConst.status.DELIVERED,
	'email.complained': emailConst.status.COMPLAINED,
	'email.bounced': emailConst.status.BOUNCED,
	'email.delivery_delayed': emailConst.status.DELAYED,
	'email.failed': emailConst.status.FAILED
};

const resendService = {

	async webhooks(c, body) {

		const type = body?.type;
		const status = eventStatusMap[type];

		if (status === undefined) {
			console.log(`resend webhook ignored, unsupported type: ${type}`);
			return;
		}

		const resendEmailId = body?.data?.email_id;

		if (!resendEmailId) {
			console.log(`resend webhook ignored, missing email_id, type: ${type}`);
			return;
		}

		const params = {
			resendEmailId,
			status,
			message: null
		}

		if (type === 'email.bounced') {
			const bounce = body?.data?.bounce;
			params.message = bounce ? JSON.stringify(bounce) : null;
		}

		if (type === 'email.failed') {
			params.message = body?.data?.failed?.reason ?? null;
		}

		const emailRow = await emailService.updateEmailStatus(c, params)

		if (!emailRow) {
			console.log(`resend webhook ignored, email not found, type: ${type}, email_id: ${resendEmailId}`);
		}

	}
}

export default resendService

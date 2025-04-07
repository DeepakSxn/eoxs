import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();

    // Debug: Log request data
    console.log('Sending email to:', to);

    // Validate request data
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, or html' },
        { status: 400 }
      );
    }

    // Get and validate email configuration
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS; // Try the other environment variable name

    // Debug: Log available environment variables
    console.log('Available EMAIL environment variables:', 
      Object.keys(process.env)
        .filter(key => key.includes('EMAIL'))
        .map(key => `${key}: ${key === 'EMAIL_PASS' || key === 'EMAIL_APP_PASSWORD' ? '***' : process.env[key]}`)
    );

    // Validate environment variables
    if (!emailUser || !emailPass) {
      // Try alternative password variable
      const altEmailPass = process.env.EMAIL_APP_PASSWORD;
      
      if (!altEmailPass) {
        console.error('Missing email configuration:', {
          hasUser: !!emailUser,
          hasPass: !!emailPass,
          hasAppPass: !!altEmailPass,
          envKeys: Object.keys(process.env).filter(key => key.includes('EMAIL'))
        });
        return NextResponse.json(
          { error: 'Email service not properly configured - missing credentials' },
          { status: 500 }
        );
      }
    }

    // Use the password that's available
    const finalEmailPass = emailPass || process.env.EMAIL_APP_PASSWORD;

    // Create transporter with secure Gmail configuration
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: emailUser?.trim(),
        pass: finalEmailPass?.trim()
      },
      debug: true
    });

    // Debug: Log transporter configuration
    console.log('Transporter Configuration:', {
      host: transporter.options.host,
      port: transporter.options.port,
      secure: transporter.options.secure,
      hasAuth: !!transporter.options.auth,
      user: emailUser
    });

    // Send email
    try {
      const info = await transporter.sendMail({
        from: {
          name: 'Video Dashboard',
          address: emailUser?.trim() || ''
        },
        to,
        subject,
        html,
      });

      console.log('Email sent successfully:', {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      });

      return NextResponse.json({
        success: true,
        messageId: info.messageId
      });
    } catch (sendError: any) {
      console.error('Failed to send email:', {
        error: sendError.message,
        code: sendError.code,
        command: sendError.command,
        response: sendError.response
      });
      return NextResponse.json(
        { 
          error: `Failed to send email: ${sendError.message}`,
          details: sendError.response || sendError.code
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error in email API:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    );
  }
} 
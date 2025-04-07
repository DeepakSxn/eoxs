import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports like 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (!body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const { email, playlistLink } = body;

    if (!email || !playlistLink) {
      return NextResponse.json(
        { error: 'Email and playlist link are required' },
        { status: 400 }
      );
    }

    // Verify email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Email content
    const mailOptions = {
      from: `"Video Platform" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Video Playlist Link',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Your Video Playlist is Ready!</h2>
          <p>Thank you for using our video platform. Your playlist has been created successfully.</p>
          <p>Click the button below to view your playlist:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/playlistlog" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Playlist
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, you can copy and paste this link into your browser:<br>
             <a href="http://localhost:3000/playlistlog" 
          </p>
        </div>
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId 
    });
  } catch (error) {
    console.error('Email error:', error);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('Invalid login')) {
        return NextResponse.json(
          { error: 'Invalid email credentials' },
          { status: 401 }
        );
      }
      if (error.message.includes('connect')) {
        return NextResponse.json(
          { error: 'Failed to connect to email server' },
          { status: 503 }
        );
      }
    }

    // Default error response
    return NextResponse.json(
      { 
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
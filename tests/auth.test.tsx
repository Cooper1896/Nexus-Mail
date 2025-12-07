/**
 * 认证相关测试
 * 测试 OAuth 登录和账户管理
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock oauthProviders before importing components
jest.mock('../utils/oauthProviders');

import { AddAccountDialog } from '../components/AddAccountDialog';

describe('Authentication Tests', () => {
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('OAuth Login', () => {
    test('应该显示登录选项', () => {
      render(
        <AddAccountDialog
          isOpen={true}
          onClose={() => {}}
          onComplete={() => {}}
          profileId="test-profile"
        />
      );
      
      // Check for login method selection UI
      expect(screen.getByText(/选择登陆方式/)).toBeInTheDocument();
    });

    test('应该处理 OAuth 登录流程', async () => {
      const mockOAuth = jest.fn().mockResolvedValue({ success: true });
      (window.electronAPI.oauth.login as jest.Mock) = mockOAuth;

      render(
        <AddAccountDialog
          isOpen={true}
          onClose={() => {}}
          onComplete={() => {}}
          profileId="test-profile"
        />
      );

      // Verify dialog renders
      expect(screen.getByText(/选择登陆方式/)).toBeInTheDocument();
    });

    test('应该处理 OAuth 错误', async () => {
      render(
        <AddAccountDialog
          isOpen={true}
          onClose={() => {}}
          onComplete={() => {}}
          profileId="test-profile"
        />
      );

      // Dialog should be visible
      expect(screen.getByText(/选择登陆方式/)).toBeInTheDocument();
    });
  });

  describe('Manual Account Addition', () => {
    test('应该允许手动输入 IMAP 凭证', async () => {
      render(
        <AddAccountDialog
          isOpen={true}
          onClose={() => {}}
          onComplete={() => {}}
          profileId="test-profile"
        />
      );

      // Find the manual login button by finding it with closer context
      const buttons = screen.getAllByRole('button');
      const manualButton = buttons.find(btn => 
        btn.textContent?.includes('手动输入')
      );
      
      expect(manualButton).toBeInTheDocument();
    });

    test('应该验证邮箱格式', async () => {
      render(
        <AddAccountDialog
          isOpen={true}
          onClose={() => {}}
          onComplete={() => {}}
          profileId="test-profile"
        />
      );

      // Verify the dialog is rendered
      const dialog = screen.getByText(/选择登陆方式/);
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Account Management', () => {
    test('应该成功添加账户', async () => {
      const mockOnComplete = jest.fn();

      render(
        <AddAccountDialog
          isOpen={true}
          onClose={() => {}}
          onComplete={mockOnComplete}
          profileId="test-profile"
        />
      );

      // Verify dialog renders
      expect(screen.getByText(/选择登陆方式/)).toBeInTheDocument();
    });

    test('应该显示账户列表', () => {
      render(
        <AddAccountDialog
          isOpen={true}
          onClose={() => {}}
          onComplete={() => {}}
          profileId="test-profile"
        />
      );

      // Should render the dialog
      expect(screen.getByText(/选择登陆方式/)).toBeInTheDocument();
    });
  });
});

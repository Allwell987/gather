import React from 'react';
import renderer from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props: any) => React.createElement('Text', props),
  };
});

// Ensure native Platform constants exist for the test environment
const { NativeModules } = require('react-native');
NativeModules.PlatformConstants = {
  ...(NativeModules.PlatformConstants || {}),
  forceTouchAvailable: false,
  osVersion: '0',
  getConstants: () => ({ forceTouchAvailable: false, osVersion: '0' }),
};

const DevotionalCard = require('../DevotionalCard').default;

const sample = {
  id: '1',
  publish_date: '2026-05-27',
  title: 'Trust the Lord',
  anchor_scripture: 'Psalm 23:1',
  opening_charge: 'Begin with prayer',
  core_teaching: 'God is our shepherd and guide.',
  supporting_scriptures: ['John 10:11', 'Matthew 6:33'],
  spiritual_insight: 'Rely on God daily.',
  biblical_example: 'David trusted God in the cave.',
  warning_correction: 'Do not lean on your own understanding.',
  declaration: 'I walk in God\'s provision.',
  summary: 'Trust God today.'
};

it('renders devotional card snapshot', () => {
  const testRenderer = renderer.create(
    <DevotionalCard devotional={sample as any} onShare={() => {}} onMarkRead={() => {}} />
  );

  try {
    expect(testRenderer.toJSON()).toMatchSnapshot();
  } finally {
    testRenderer.unmount();
  }
});

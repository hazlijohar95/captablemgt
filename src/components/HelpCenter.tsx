import { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  XMarkIcon, 
  QuestionMarkCircleIcon,
  BookOpenIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpenIcon,
    articles: [
      { title: 'Setting up your first cap table', duration: '5 min read' },
      { title: 'Understanding equity basics', duration: '8 min read' },
      { title: 'Adding stakeholders', duration: '3 min read' },
      { title: 'Creating your first option grant', duration: '7 min read' }
    ]
  },
  {
    id: 'cap-table',
    title: 'Cap Table Management',
    icon: BookOpenIcon,
    articles: [
      { title: 'Managing different share classes', duration: '6 min read' },
      { title: 'Tracking vesting schedules', duration: '4 min read' },
      { title: 'Converting shares and options', duration: '5 min read' },
      { title: 'Understanding dilution', duration: '10 min read' }
    ]
  },
  {
    id: 'scenarios',
    title: 'Modeling & Scenarios',
    icon: BookOpenIcon,
    articles: [
      { title: 'Creating funding round scenarios', duration: '8 min read' },
      { title: 'Waterfall analysis explained', duration: '12 min read' },
      { title: 'Exit scenario modeling', duration: '9 min read' },
      { title: 'Understanding liquidation preferences', duration: '7 min read' }
    ]
  },
  {
    id: 'documents',
    title: 'Documents & Compliance',
    icon: BookOpenIcon,
    articles: [
      { title: 'Generating stock certificates', duration: '4 min read' },
      { title: '409A valuation requirements', duration: '15 min read' },
      { title: 'Board resolution templates', duration: '6 min read' },
      { title: 'Equity compensation reporting', duration: '11 min read' }
    ]
  }
];

const videoTutorials = [
  { title: 'Platform Overview', duration: '5:30', thumbnail: '🎥' },
  { title: 'Creating Your First Grant', duration: '8:45', thumbnail: '📝' },
  { title: 'Modeling a Series A', duration: '12:15', thumbnail: '📊' },
  { title: 'Document Generation', duration: '6:20', thumbnail: '📄' }
];

export function HelpCenter({ isOpen, onClose }: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<'articles' | 'videos' | 'contact'>('articles');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory] = useState<string>('');

  const filteredCategories = helpCategories.filter(category => 
    !selectedCategory || category.id === selectedCategory
  ).filter(category => 
    !searchQuery || 
    category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.articles.some(article => 
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'articles':
        return (
          <div>
            <div className="mb-6">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="space-y-6">
              {filteredCategories.map((category) => (
                <div key={category.id}>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <category.icon className="h-5 w-5 mr-2 text-primary-600" />
                    {category.title}
                  </h3>
                  <div className="space-y-2">
                    {category.articles.map((article, index) => (
                      <button
                        key={index}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors"
                      >
                        <span className="text-sm text-gray-900">{article.title}</span>
                        <span className="text-xs text-gray-500">{article.duration}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'videos':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Video Tutorials</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {videoTutorials.map((video, index) => (
                <button
                  key={index}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="text-3xl mr-4">{video.thumbnail}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">{video.title}</h4>
                    <p className="text-sm text-gray-500">{video.duration}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'contact':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Get Help</h3>
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-primary-600 mr-2" />
                  <h4 className="font-medium">Live Chat Support</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Get instant help from our support team. Available Monday-Friday, 9 AM - 6 PM PST.
                </p>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                  Start Chat
                </button>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <BookOpenIcon className="h-5 w-5 text-primary-600 mr-2" />
                  <h4 className="font-medium">Schedule Demo</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Book a personalized demo with our team to learn best practices for your cap table.
                </p>
                <button className="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 text-sm">
                  Book Demo
                </button>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium mb-2">Send us a message</h4>
                <form className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Brief description of your question"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                    <textarea
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Describe your question or issue in detail..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center">
                    <QuestionMarkCircleIcon className="h-6 w-6 mr-2 text-primary-600" />
                    Help Center
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex">
                  {/* Sidebar */}
                  <div className="w-64 border-r border-gray-200 p-6">
                    <nav className="space-y-2">
                      <button
                        onClick={() => setActiveTab('articles')}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === 'articles'
                            ? 'bg-primary-50 text-primary-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <BookOpenIcon className="mr-3 h-4 w-4" />
                        Help Articles
                      </button>
                      <button
                        onClick={() => setActiveTab('videos')}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === 'videos'
                            ? 'bg-primary-50 text-primary-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <VideoCameraIcon className="mr-3 h-4 w-4" />
                        Video Tutorials
                      </button>
                      <button
                        onClick={() => setActiveTab('contact')}
                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          activeTab === 'contact'
                            ? 'bg-primary-50 text-primary-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <ChatBubbleLeftRightIcon className="mr-3 h-4 w-4" />
                        Contact Support
                      </button>
                    </nav>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 p-6 max-h-96 overflow-y-auto">
                    {renderTabContent()}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}